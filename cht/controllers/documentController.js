import {
  getAllDocuments,
  deleteDocument as deleteDoc,
} from "../services/indexingService.js";

/**
 * Lists all currently indexed/processing documents.
 */
export function listDocuments(req, res) {
  try {
    const docs = getAllDocuments();
    res.json({ documents: docs });
  } catch (error) {
    console.error("❌ List documents error:", error.message);
    res.status(500).json({ error: "Failed to list documents" });
  }
}

/**
 * Deletes a specific document's vectors from Qdrant.
 */
export async function deleteDocument(req, res) {
  try {
    const { docId } = req.params;

    if (!docId) {
      return res.status(400).json({ error: "Missing docId" });
    }

    await deleteDoc(docId);
    res.json({ message: `Document ${docId} deleted successfully` });
  } catch (error) {
    console.error("❌ Delete document error:", error.message);
    res.status(500).json({
      error: "Failed to delete document",
      details: error.message,
    });
  }
}
