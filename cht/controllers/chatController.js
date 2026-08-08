import { askQuestion } from "../services/chatService.js";

/**
 * Handles chat requests.
 * Accepts { query, docIds? } and returns { answer, sources }.
 */
export async function chat(req, res) {
  try {
    const { query, docIds } = req.body;

    console.log("📨 Chat request:", { query, docIds });

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    const result = await askQuestion(query, docIds);
    console.log("✅ Chat response generated");

    res.json(result);
  } catch (error) {
    console.error("❌ Chat error:", error.message);
    res.status(500).json({
      error: "Failed to process chat request",
      details: error.message,
    });
  }
}
