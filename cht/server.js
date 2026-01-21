import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import OpenAI from "openai";
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import "dotenv/config";

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// In-memory job tracking (use Redis in production)
const jobs = new Map();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.GOOGLE_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

// Background indexing function
async function indexPDF(jobId, filePath, collectionName) {
  try {
    jobs.set(jobId, { status: 'processing', progress: 10 });

    // Load PDF
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();
    
    jobs.set(jobId, { status: 'processing', progress: 40 });

    // Create embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "text-embedding-004"
    });

    jobs.set(jobId, { status: 'processing', progress: 60 });

    // Store in Qdrant
    await QdrantVectorStore.fromDocuments(docs, embeddings, {
      url: process.env.QDRANT_URL,
      collectionName: collectionName,
    });

    jobs.set(jobId, { status: 'completed', progress: 100, collectionName });

    console.log(`✅ Indexing completed for job: ${jobId}`);
  } catch (error) {
    console.error(`❌ Indexing failed for job ${jobId}:`, error);
    jobs.set(jobId, { status: 'failed', progress: 0, error: error.message });
  }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Upload PDF endpoint
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const jobId = uuidv4();
    const collectionName = `pdf-${jobId}`;
    const filePath = req.file.path;

    // Initialize job
    jobs.set(jobId, { status: 'pending', progress: 0 });

    // Start background indexing (non-blocking)
    indexPDF(jobId, filePath, collectionName).catch(err => {
      console.error('Indexing error:', err);
    });

    res.json({
      jobId,
      collectionName,
      message: 'Upload successful, indexing started'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Check indexing status
app.get('/api/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { query, collectionName } = req.body;

    console.log('📨 Chat request received:', { query, collectionName });

    if (!query || !collectionName) {
      return res.status(400).json({ error: 'Missing query or collectionName' });
    }

    // Create embeddings
    console.log('🔧 Creating embeddings...');
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "text-embedding-004"
    });

    // Connect to existing collection
    console.log('🔗 Connecting to Qdrant collection:', collectionName);
    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
      url: process.env.QDRANT_URL,
      collectionName: collectionName,
    });

    // Search for relevant chunks
    console.log('🔍 Searching for relevant chunks...');
    const vectorSearch = vectorStore.asRetriever({ k: 3 });
    const relevantChunks = await vectorSearch.invoke(query);
    console.log(`✅ Found ${relevantChunks.length} relevant chunks`);

    // Build system prompt
    const SYSTEM_PROMPT = `
YOU ARE AN AI ASSISTANT WHO HELPS RESOLVE QUERIES BASED ON THE CONTEXT AVAILABLE TO YOU FROM A PDF FILE WITH THE CONTENT AND PAGE NUMBER.
ONLY ANSWER BASED ON THE AVAILABLE CONTEXT FROM THE FILE.

CONTEXT: ${relevantChunks.map((doc, i) => `
[Chunk ${i + 1}]
Page: ${doc.metadata?.loc?.pageNumber ?? "unknown"}
${doc.pageContent}
`).join("\n")}
    `;

    // Get response from AI
    console.log('🤖 Generating AI response...');
    const response = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query }
      ]
    });

    const answer = response.choices[0].message.content;
    console.log('✅ Chat response generated successfully');

    res.json({ response: answer });
  } catch (error) {
    console.error('❌ Chat error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to process chat request',
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 API endpoints:`);
  console.log(`   - POST /api/upload`);
  console.log(`   - GET  /api/status/:jobId`);
  console.log(`   - POST /api/chat`);
});