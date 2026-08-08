import express from "express";
import { upload } from "../config/multer.js";
import { uploadPDFs } from "../controllers/uploadController.js";
import { getStatus } from "../controllers/statusController.js";
import { chat } from "../controllers/chatController.js";
import {
  listDocuments,
  deleteDocument,
} from "../controllers/documentController.js";

const router = express.Router();

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", message: "DocFinder API is running" });
});

// Upload multiple PDFs (up to 10 at once)
router.post("/upload", upload.array("pdfs", 10), uploadPDFs);

// Check indexing job status
router.get("/status/:jobId", getStatus);

// Document management
router.get("/documents", listDocuments);
router.delete("/documents/:docId", deleteDocument);

// Chat with RAG
router.post("/chat", chat);

export default router;
