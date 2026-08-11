import { getEmbeddings, getLLM } from "../config/ai.js";
import { getClient, getCollectionName } from "../config/qdrant.js";

// Helper to wrap promises with a timeout
function withTimeout(promise, ms, operationName = "Operation") {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

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
 * @param {Array}    history - Conversation history
 * @returns {{ answer: string, sources: Array<{ fileName, pageNumber, chunkIndex, snippet }> }}
 */
export async function askQuestion(query, docIds = [], history = [], sessionId) {
  const TOP_K = 5;

  console.log(`[CHAT] request received`);
  console.log(`[CHAT] query: "${query}"`);
  console.log(`[CHAT] conversation history length: ${history?.length || 0}`);
  console.log(`[CHAT] document IDs:`, docIds);
  console.log(`[SESSION] Chat request from: ${sessionId}`);

  if (history && history.length > 0) {
    console.log(`[CHAT] history contents/roles:`);
    history.forEach((msg, i) => {
      console.log(`  [${i + 1}] role: ${msg.role} | content: "${msg.content.substring(0, 60)}..."`);
    });
  }

  // ── Step 1: Rewrite follow-up query based on history if present ─────────
  let retrievalQuery = query;

  if (history && history.length > 0) {
    console.log("🔄 Rephrasing follow-up query based on history...");
    const llm = getLLM();

    const historyString = history
      .map((msg) => `${msg.role === "user" ? "Human" : "Assistant"}: ${msg.content}`)
      .join("\n");

    const rephrasePrompt = `Given the following conversation history and a follow-up question, rewrite the follow-up question to be a standalone, self-contained search query. 
The standalone query should contain all necessary context (like specific subjects, protocols, or document names) mentioned in the history so that it can be used to search a document database.

DO NOT answer the question. ONLY output the rewritten standalone query.

CONVERSATION HISTORY:
${historyString}

FOLLOW-UP QUESTION:
${query}

STANDALONE SEARCH QUERY:`;

    try {
      console.log(`[CHAT] Gemini query rephrase started`);
      const rephraseResponse = await withTimeout(
        llm.invoke([{ role: "user", content: rephrasePrompt }]),
        10000,
        "Query rephrasing"
      );
      const resultText = rephraseResponse.content.trim();
      if (resultText) {
        console.log(`  Original query: "${query}"`);
        console.log(`  Reformulated retrieval query: "${resultText}"`);
        retrievalQuery = resultText;
      }
    } catch (err) {
      console.error("⚠️ Failed to reformulate query, using original query:", err);
    }
  }

  // ── Step 2: Embed the query ────────────────────────────────────────────
  console.log(`[CHAT] retrieval started`);
  let queryVector;
  try {
    console.log(`🔧 Embedding query: "${retrievalQuery}"...`);
    const embeddings = getEmbeddings();
    queryVector = await withTimeout(
      embeddings.embedQuery(retrievalQuery),
      10000,
      "Query embedding"
    );
  } catch (err) {
    console.error(`❌ [CHAT] Embedding failed:`, err);
    throw err;
  }

  // ── Step 3: Similarity search in Qdrant ────────────────────────────────
  console.log("🔍 Searching Qdrant for relevant chunks...");
  const qdrant = getClient();
  const collectionName = getCollectionName();

  // Build mandatory filter for sessionId and optional filter for specific documents
  const filter = {
    must: [
      {
        key: "sessionId",
        match: { value: sessionId },
      },
    ],
  };

  if (docIds && docIds.length > 0) {
    filter.must.push({
      key: "docId",
      match: { any: docIds },
    });
  }

  let searchResult;
  try {
    searchResult = await withTimeout(
      qdrant.search(collectionName, {
        vector: queryVector,
        limit: TOP_K,
        with_payload: true,
        filter,
      }),
      10000,
      "Qdrant vector search"
    );
  } catch (err) {
    console.error(`❌ [CHAT] Qdrant search failed:`, err);
    throw err;
  }

  console.log(`[CHAT] retrieval completed`);
  console.log(`[CHAT] chunks found: ${searchResult?.length || 0}`);
  console.log(`[SESSION] Qdrant results: ${searchResult?.length || 0}`);

  if (!searchResult || searchResult.length === 0) {
    return {
      answer:
        "I couldn't find any relevant information in the uploaded documents to answer your question. Please try rephrasing or upload a relevant document.",
      sources: [],
    };
  }

  // ── Step 4: Build RAG prompt ───────────────────────────────────────────
  const contextBlocks = searchResult.map((hit) => hit.payload.text);

  const systemPrompt = `You are DocFinder, an intelligent AI assistant that answers questions strictly based on the provided document context.

RULES:
- Answer ONLY based on the context provided below. If the context doesn't contain enough information, say so clearly.
- You may explain and elaborate on concepts found in the context using your knowledge, but the core topic MUST be present in the documents.
- DO NOT include citations, source numbers, document names, page numbers, [1], [2], Source 1, Source 2, or any citation notation in your response. Return only the natural-language answer.
- Provide clear, well-structured answers using markdown formatting when appropriate.
- Synthesize information from the provided context to create a unified answer.

CONTEXT FROM UPLOADED DOCUMENTS:
${contextBlocks.join("\n---\n")}`;

  // ── Step 5: Generate answer ────────────────────────────────────────────
  console.log(`[CHAT] Gemini request started`);
  const llm = getLLM();

  const messagesPayload = [
    { role: "system", content: systemPrompt }
  ];

  // Add conversation history to messagesPayload
  if (history && history.length > 0) {
    history.forEach((msg) => {
      messagesPayload.push({
        role: msg.role === "user" ? "human" : "ai",
        content: msg.content
      });
    });
  }

  // Add the original user question
  messagesPayload.push({ role: "human", content: query });

  let response;
  try {
    response = await withTimeout(
      llm.invoke(messagesPayload),
      30000,
      "Gemini response generation"
    );
  } catch (err) {
    console.error(`❌ [CHAT] Gemini request failed:`, err);
    throw err;
  }

  console.log(`[CHAT] Gemini response received`);
  const rawAnswer = response.content;

  // Sanitizer regex to programmatically remove any citation patterns from text response
  const sanitizeAnswer = (text) => {
    if (!text) return "";
    return text
      // Replace grouped Source X (e.g. [Source 1, Source 2] or (Source 1, Source 2))
      .replace(/[\[\(]Source\s+\d+(?:[\s,]+Source\s+\d+)*[\]\)]/gi, "")
      // Replace individual Source X (e.g. Source 1 or [Source 1] or (Source 1))
      .replace(/\[?Source\s+\d+\]?/gi, "")
      // Replace bracketed numerical citations like [1], [2], [1, 2], [1-3]
      .replace(/\[\d+(?:[\s,–-]+\d+)*\]/g, "")
      // Replace parenthesized numerical citations like (1), (2), (1, 2)
      .replace(/\(\d+(?:[\s,–-]+\d+)*\)/g, "")
      // Clean up spacing before punctuation
      .replace(/\s+([.,;!?])/g, "$1")
      // Trim extra spaces
      .replace(/ +/g, " ")
      .trim();
  };

  const answer = sanitizeAnswer(rawAnswer);

  // ── Step 6: Extract source citations ───────────────────────────────────
  const sources = searchResult.map((hit) => ({
    fileName: hit.payload.fileName,
    docId: hit.payload.docId,
    pageNumber: hit.payload.pageNumber,
    chunkIndex: hit.payload.chunkIndex,
    snippet: hit.payload.text,
    score: parseFloat(hit.score.toFixed(3)),
  }));

  console.log(`[CHAT] response returned`);
  console.log("✅ Answer generated with", sources.length, "sources");

  return { answer, sources };
}
