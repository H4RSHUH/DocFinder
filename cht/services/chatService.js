import { getEmbeddings, getLLM } from "../config/ai.js";
import { getClient, getCollectionName } from "../config/qdrant.js";

/**
 * Performs the retrieval-augmented generation (RAG) pipeline:
 *   1. Embed the user query
 *   2. Query Qdrant for top-K similar chunks (optionally filtered by docIds)
 *   3. Build a RAG prompt with context
 *   4. Generate an answer via Gemini
 *   5. Return the answer + source citations
 *
 * @param {string}   query   - User's question
 * @param {string[]} docIds  - Optional array of document IDs to filter on
 * @returns {{ answer: string, sources: Array<{ fileName, pageNumber, chunkIndex, snippet }> }}
 */
export async function askQuestion(query, docIds = []) {
  const TOP_K = 5;

  // ── Step 1: Embed the query ────────────────────────────────────────────
  console.log("🔧 Embedding query...");
  const embeddings = getEmbeddings();
  const queryVector = await embeddings.embedQuery(query);

  // ── Step 2: Similarity search in Qdrant ────────────────────────────────
  console.log("🔍 Searching Qdrant for relevant chunks...");
  const qdrant = getClient();
  const collectionName = getCollectionName();

  // Build optional filter for specific documents
  const filter =
    docIds && docIds.length > 0
      ? {
          must: [
            {
              key: "docId",
              match: { any: docIds },
            },
          ],
        }
      : undefined;

  const searchResult = await qdrant.search(collectionName, {
    vector: queryVector,
    limit: TOP_K,
    with_payload: true,
    filter,
  });

  if (!searchResult || searchResult.length === 0) {
    return {
      answer:
        "I couldn't find any relevant information in the uploaded documents to answer your question. Please try rephrasing or upload a relevant document.",
      sources: [],
    };
  }

  console.log(`✅ Found ${searchResult.length} relevant chunks`);

  // ── Step 3: Build RAG prompt ───────────────────────────────────────────
  const contextBlocks = searchResult.map((hit, i) => {
    const p = hit.payload;
    return `[Source ${i + 1}] File: "${p.fileName}" | Page: ${p.pageNumber ?? "N/A"} | Score: ${hit.score.toFixed(3)}
${p.text}`;
  });

  const systemPrompt = `You are DocFinder, an intelligent AI assistant that answers questions strictly based on the provided document context.

RULES:
- Answer ONLY based on the context provided below. If the context doesn't contain enough information, say so clearly.
- You may explain and elaborate on concepts found in the context using your knowledge, but the core topic MUST be present in the documents.
- Always reference which source(s) you're drawing from (e.g., "According to Source 1..." or "Based on the document...").
- Provide clear, well-structured answers using markdown formatting when appropriate.
- If multiple sources are relevant, synthesize information from all of them.

CONTEXT FROM UPLOADED DOCUMENTS:
${contextBlocks.join("\n\n")}`;

  // ── Step 4: Generate answer ────────────────────────────────────────────
  console.log("🤖 Generating answer...");
  const llm = getLLM();
  const response = await llm.invoke([
    { role: "system", content: systemPrompt },
    { role: "human", content: query },
  ]);

  const answer = response.content;

  // ── Step 5: Extract source citations ───────────────────────────────────
  const sources = searchResult.map((hit) => ({
    fileName: hit.payload.fileName,
    pageNumber: hit.payload.pageNumber,
    chunkIndex: hit.payload.chunkIndex,
    snippet: hit.payload.text.substring(0, 150) + "...",
    score: parseFloat(hit.score.toFixed(3)),
  }));

  console.log("✅ Answer generated with", sources.length, "sources");

  return { answer, sources };
}
