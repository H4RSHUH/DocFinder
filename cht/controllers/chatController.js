import { askQuestion } from "../services/chatService.js";
import { classifyError } from "../utils/errorClassifier.js";

/**
 * Handles chat requests.
 * Accepts { query, docIds?, history } and returns { answer, sources }.
 */
export async function chat(req, res) {
  try {
    const { query, docIds, history } = req.body;

    console.log("📨 Chat request:", { query, docIds, historyCount: history?.length || 0 });

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    const result = await askQuestion(query, docIds, history);
    console.log("✅ Chat response generated");

    res.json(result);
  } catch (error) {
    const errorResponse = classifyError(error);
    res.status(500).json(errorResponse);
  }
}
