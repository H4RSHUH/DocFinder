import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import "dotenv/config";

/**
 * Returns a ChatGoogleGenerativeAI instance for LLM generation.
 * Uses gemini-2.5-flash for fast, high-quality responses.
 */
export function getLLM() {
  return new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.3,
    maxOutputTokens: 4096,
    maxRetries: 0,
  });
}

/**
 * Returns a GoogleGenerativeAIEmbeddings instance for vector embedding.
 * Uses gemini-embedding-001 (3072-dimensional output).
 */
export function getEmbeddings() {
  return new GoogleGenerativeAIEmbeddings({
    modelName: "gemini-embedding-001",
    model: "gemini-embedding-001",
    apiKey: process.env.GEMINI_API_KEY,
    maxRetries: 3,
  });
}

// Export singleton instance as requested
export const embeddings = getEmbeddings();
