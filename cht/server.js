import express from "express";
import cors from "cors";
import "dotenv/config";
import apiRoutes from "./routes/api.js";
import { ensureCollection } from "./config/qdrant.js";

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────
app.use("/api", apiRoutes);

// ── Startup ──────────────────────────────────────────────────────────────
async function start() {
  try {
    // Ensure Qdrant collection exists before accepting requests
    await ensureCollection();

    app.listen(PORT, () => {
      console.log(`🚀 DocFinder API running on http://localhost:${PORT}`);
      console.log(`📝 Endpoints:`);
      console.log(`   POST   /api/upload          — Upload PDFs`);
      console.log(`   GET    /api/status/:jobId    — Check indexing status`);
      console.log(`   GET    /api/documents        — List documents`);
      console.log(`   DELETE /api/documents/:docId — Delete document`);
      console.log(`   POST   /api/chat             — Ask a question`);
      console.log(`   GET    /api/health           — Health check`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

start();