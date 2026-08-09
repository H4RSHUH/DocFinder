import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { getEmbeddings } from "../config/ai.js";
import { getClient, getCollectionName } from "../config/qdrant.js";

const EXPECTED_VECTOR_SIZE = 3072;

// ---------------------------------------------------------------------------
// In-memory job & document tracking
// ---------------------------------------------------------------------------
const jobs = new Map();
const documents = new Map(); // docId → { docId, fileName, fileSize, totalChunks, status, uploadedAt }

export function getJob(jobId) {
  return jobs.get(jobId);
}

export function createJob(jobId, fileName) {
  jobs.set(jobId, { status: "pending", progress: 0, fileName });
}

export function getAllDocuments() {
  return Array.from(documents.values());
}

export function getDocument(docId) {
  return documents.get(docId);
}

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Helper to embed a batch of documents with retries on API errors or empty vectors
async function embedBatchWithRetry(embeddings, texts, retries = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const vectors = await embeddings.embedDocuments(texts);
      if (vectors && vectors.length > 0 && vectors[0] && vectors[0].length > 0) {
        return vectors;
      }
      console.warn(`⚠️ [embedBatch] Attempt ${attempt} returned empty vectors. Retrying in ${delayMs}ms...`);
    } catch (err) {
      console.warn(`⚠️ [embedBatch] Attempt ${attempt} failed: ${err.message}. Retrying in ${delayMs}ms...`);
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Embedding service returned empty vectors or failed after multiple retries.");
}

// ---------------------------------------------------------------------------
// RAG Ingestion Pipeline
// ---------------------------------------------------------------------------

/**
 * Indexes a single PDF through the full RAG pipeline:
 *   1. Text Extraction (PDFLoader)
 *   2. Chunking (RecursiveCharacterTextSplitter)
 *   3. Embedding (GoogleGenerativeAIEmbeddings / gemini-embedding-001)
 *   4. Vector Storage (Qdrant upsert with metadata)
 */
export async function indexPDF(jobId, docId, filePath, fileName, fileSize) {
  try {
    jobs.set(jobId, { status: "processing", progress: 5, fileName });
    documents.set(docId, {
      id: docId,
      docId,
      name: fileName,
      fileName,
      size: formatFileSize(fileSize),
      fileSize,
      chunks: 0,
      totalChunks: 0,
      status: "processing",
      uploadedAt: new Date().toISOString(),
    });

    // ── Step 1: Text Extraction ──────────────────────────────────────────
    console.log(`📄 [${fileName}] Extracting text...`);
    let rawDocs = [];
    try {
      const loader = new PDFLoader(filePath);
      rawDocs = await loader.load();
    } catch (parseErr) {
      console.error(`❌ [${fileName}] PDF parse error:`, parseErr.message);
      throw new Error(`Failed to parse PDF document: ${parseErr.message}`);
    }

    jobs.set(jobId, { status: "processing", progress: 20, fileName });

    const totalTextLength = rawDocs.reduce((acc, doc) => acc + (doc.pageContent || "").trim().length, 0);

    if (rawDocs.length === 0 || totalTextLength === 0) {
      throw new Error(
        "PDF text extraction failed or PDF contains no readable text (scanned image or empty document)."
      );
    }

    // ── Step 2: Chunking ─────────────────────────────────────────────────
    console.log(`✂️  [${fileName}] Splitting into chunks...`);
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitDocuments(rawDocs);
    jobs.set(jobId, { status: "processing", progress: 40, fileName });

    if (!chunks || chunks.length === 0) {
      throw new Error("Failed to split document into text chunks.");
    }

    // Enrich chunk metadata
    const enrichedChunks = chunks.map((chunk, index) => ({
      text: chunk.pageContent,
      metadata: {
        docId,
        fileName,
        chunkIndex: index,
        pageNumber: chunk.metadata?.loc?.pageNumber ?? null,
      },
    }));

    console.log(
      `📦 [${fileName}] Created ${enrichedChunks.length} chunks from ${rawDocs.length} pages`
    );

    // ── Step 3: Embedding ────────────────────────────────────────────────
    console.log(`🧠 [${fileName}] Generating embeddings...`);
    const embeddings = getEmbeddings();

    const BATCH_SIZE = 25;
    const allVectors = [];

    console.log(`[INDEX] Ingestion Details:`);
    console.log(`  - File name: ${fileName}`);
    console.log(`  - Total chunks to embed: ${enrichedChunks.length}`);
    console.log(`  - Embedding Model: gemini-embedding-001`);
    console.log(`  - Batch size: ${BATCH_SIZE}`);

    for (let i = 0; i < enrichedChunks.length; i += BATCH_SIZE) {
      // Respect Google's free-tier rate limits (15 RPM)
      if (i > 0) {
        console.log(`[INDEX] Waiting 3.5s before next batch to respect rate limits...`);
        await new Promise((resolve) => setTimeout(resolve, 3500));
      }

      const batch = enrichedChunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c) => c.text);

      console.log(`[INDEX] Processing chunk range: #${i + 1} to #${Math.min(i + batch.length, enrichedChunks.length)}`);
      batch.forEach((c, idx) => {
        console.log(`  [Chunk #${i + idx + 1}] Character length: ${c.text.length}`);
      });

      let vectors;
      try {
        vectors = await embedBatchWithRetry(embeddings, texts, 4, 8000);
        console.log(`[INDEX] Batch returned ${vectors?.length || 0} vectors. Vector size: ${vectors?.[0]?.length || 0}`);
      } catch (embErr) {
        console.error(`❌ [${fileName}] Embedding API Error:`, embErr);
        throw new Error(`Embedding generation failed: ${embErr.message}`);
      }

      if (!vectors || vectors.length === 0 || !vectors[0] || vectors[0].length === 0) {
        console.error(
          `❌ [${fileName}] GEMINI_API_KEY issue: embedDocuments returned empty vector []!`
        );
        throw new Error(
          "Embedding service returned empty vectors. Please verify your GEMINI_API_KEY in cht/.env."
        );
      }

      if (vectors[0].length !== EXPECTED_VECTOR_SIZE) {
        console.error(
          `❌ [${fileName}] Embedding dimension mismatch: got ${vectors[0].length}, expected ${EXPECTED_VECTOR_SIZE}!`
        );
        throw new Error(
          `Embedding vector dimension mismatch (got ${vectors[0].length}, expected ${EXPECTED_VECTOR_SIZE})`
        );
      }

      allVectors.push(...vectors);

      const progressPct = 40 + Math.round(((i + batch.length) / enrichedChunks.length) * 40);
      jobs.set(jobId, { status: "processing", progress: progressPct, fileName });
    }

    // ── Step 4: Vector Storage (Qdrant Upsert) ───────────────────────────
    console.log(`💾 [${fileName}] Storing ${allVectors.length} vectors in Qdrant...`);
    const qdrant = getClient();
    const collectionName = getCollectionName();

    const points = enrichedChunks.map((chunk, index) => ({
      id: uuidv4(),
      vector: allVectors[index],
      payload: {
        text: chunk.text,
        ...chunk.metadata,
      },
    }));

    const UPSERT_BATCH = 100;
    for (let i = 0; i < points.length; i += UPSERT_BATCH) {
      const batch = points.slice(i, i + UPSERT_BATCH);
      try {
        await qdrant.upsert(collectionName, { points: batch });
      } catch (qdrantErr) {
        console.error(`❌ [${fileName}] Qdrant Upsert Error:`, qdrantErr.message);
        throw new Error(`Qdrant storage failed: ${qdrantErr.message}`);
      }
    }

    jobs.set(jobId, { status: "processing", progress: 95, fileName });

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  [${fileName}] Temp file deleted`);
    }

    const docObj = {
      id: docId,
      docId,
      name: fileName,
      fileName,
      size: formatFileSize(fileSize),
      fileSize,
      chunks: enrichedChunks.length,
      totalChunks: enrichedChunks.length,
      status: "indexed",
      uploadedAt: documents.get(docId)?.uploadedAt || new Date().toISOString(),
    };

    documents.set(docId, docObj);

    jobs.set(jobId, {
      status: "completed",
      progress: 100,
      fileName,
      docId,
      totalChunks: enrichedChunks.length,
    });

    console.log(
      `✅ [${fileName}] Indexing complete — ${enrichedChunks.length} chunks stored`
    );

    return docObj;
  } catch (error) {
    console.error(`❌ [INDEX ERROR LOG] Indexing failed for "${fileName}":`, error);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const safeUserMsg = "Couldn't process this document. Please try again later.";

    const failedDoc = {
      ...documents.get(docId),
      id: docId,
      docId,
      name: fileName,
      fileName,
      status: "error",
      error: safeUserMsg,
    };

    documents.set(docId, failedDoc);

    jobs.set(jobId, {
      status: "failed",
      progress: 0,
      fileName,
      error: safeUserMsg,
    });

    throw error;
  }
}

// ---------------------------------------------------------------------------
// Document Management
// ---------------------------------------------------------------------------

/**
 * Deletes all vectors belonging to a specific document from Qdrant.
 */
export async function deleteDocument(docId) {
  const qdrant = getClient();
  const collectionName = getCollectionName();

  await qdrant.delete(collectionName, {
    filter: {
      must: [{ key: "docId", match: { value: docId } }],
    },
  });

  documents.delete(docId);
  console.log(`🗑️  Deleted document ${docId} from Qdrant`);
}
