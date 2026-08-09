import { v4 as uuidv4 } from "uuid";
import { createJob, indexPDF } from "../services/indexingService.js";
import { classifyError } from "../utils/errorClassifier.js";

/**
 * Handles multi-file PDF upload.
 * Accepts req.files (array from multer.array).
 * Processes PDFs through RAG indexing pipeline and returns JSON response.
 */
export async function uploadPDFs(req, res) {
  try {
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: "No PDF files uploaded" });
    }

    const indexedDocs = [];

    for (const file of files) {
      const jobId = uuidv4();
      const docId = uuidv4();

      createJob(jobId, file.originalname);

      // Await PDF indexing so res returns actual completion status & chunk count
      try {
        const docResult = await indexPDF(
          jobId,
          docId,
          file.path,
          file.originalname,
          file.size
        );
        indexedDocs.push(docResult);
      } catch (docErr) {
        const errorResponse = classifyError(docErr);
        return res.status(400).json(errorResponse);
      }
    }

    console.log(`✅ Successfully uploaded & indexed ${indexedDocs.length} document(s)`);

    res.json({
      success: true,
      message: `${indexedDocs.length} file(s) indexed successfully`,
      documents: indexedDocs,
    });
  } catch (error) {
    console.error("❌ Upload controller error:", error.message);
    res.status(500).json({ success: false, error: "Upload failed", details: error.message });
  }
}
