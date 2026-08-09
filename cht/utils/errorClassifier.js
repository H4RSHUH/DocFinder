/**
 * Centralized backend error classifier.
 * Categorizes raw provider/API errors, logs full stack traces internally,
 * and returns clean user-facing error payloads with code and safe message.
 */
export function classifyError(error) {
  const message = error?.message || "";
  const stack = error?.stack || "";
  
  // Log the complete technical error internally in server logs
  console.error("❌ [TECHNICAL ERROR LOG]:", error);

  let code = "SERVER_ERROR";
  let userMessage = "Something went wrong. Please try again later.";

  // 1. Check for Rate Limit / Quota limits
  if (
    message.includes("429") ||
    message.toLowerCase().includes("too many requests") ||
    message.toLowerCase().includes("quota exceeded") ||
    message.toLowerCase().includes("rate limit") ||
    message.toLowerCase().includes("resource exhausted")
  ) {
    code = "RATE_LIMIT";
    userMessage = "You've reached the AI usage limit. Please try again later.";
  }
  // 2. Check for API Authentication / Configuration issues
  else if (
    message.toLowerCase().includes("key") ||
    message.toLowerCase().includes("api_key") ||
    message.toLowerCase().includes("invalid") ||
    message.toLowerCase().includes("expired") ||
    message.toLowerCase().includes("unauthorized") ||
    message.toLowerCase().includes("403") ||
    message.toLowerCase().includes("unauthenticated") ||
    message.toLowerCase().includes("not found for api version")
  ) {
    code = "AUTH_ERROR";
    userMessage = "AI service is temporarily unavailable. Please try again later.";
  }
  // 3. Check for Embedding service failures
  else if (
    message.toLowerCase().includes("embedding") ||
    message.toLowerCase().includes("embed")
  ) {
    code = "EMBEDDING_ERROR";
    userMessage = "Couldn't process this document. Please try again later.";
  }
  // 4. Check for Indexing / Upload / Storage failures
  else if (
    message.toLowerCase().includes("pdf") ||
    message.toLowerCase().includes("parse") ||
    message.toLowerCase().includes("upload") ||
    message.toLowerCase().includes("chunk") ||
    message.toLowerCase().includes("qdrant")
  ) {
    code = "INDEXING_ERROR";
    userMessage = "Couldn't process this document. Please try again later.";
  }
  // 5. Check for LLM Generation failures
  else if (
    message.toLowerCase().includes("generation") ||
    message.toLowerCase().includes("llm") ||
    message.toLowerCase().includes("gemini")
  ) {
    code = "GENERATION_ERROR";
    userMessage = "Something went wrong. Please try again later.";
  }

  return {
    success: false,
    error: {
      code,
      message: userMessage,
    }
  };
}
