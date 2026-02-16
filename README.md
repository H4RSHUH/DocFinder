# 📄 DocFinder

DocFinder is an AI-powered document assistant that allows users to upload a PDF and ask questions strictly based on its content.

The system performs intelligent document indexing using embeddings and vector search.  
If a question is asked outside the context of the uploaded PDF, the system will not provide unrelated answers.

---

## 🚀 Features

- 📤 Upload PDF documents
- ⚡ Background indexing with progress tracking
- 🧠 Vector embeddings using Google Generative AI
- 🔎 Semantic search using Qdrant vector database
- 💬 Context-aware AI chat (answers only from PDF)
- 📑 Page-number based contextual answers
- 📱 Fully responsive UI (Desktop + Mobile)
- 🗂 Session query history navigation
- 🧹 Automatic PDF deletion after indexing

---

## 🏗 Project Architecture

This is a full-stack AI application:

### Frontend
- React (Vite)
- Tailwind CSS
- React Markdown
- Lucide Icons

### Backend
- Node.js
- Express.js
- Multer (File uploads)
- LangChain
- Google Generative AI Embeddings
- Qdrant Vector Database
- Gemini 2.5 Flash (LLM)
- Docker support

---

## 📂 Project Structure

```
DOCFIN/
│
├── cht/                     # Backend
│   ├── uploads/
│   ├── node_modules/
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .env
│
├── docFin-fe/               # Frontend
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── README.md
```

---

## 🧠 How It Works

1. User uploads a PDF.
2. Backend:
   - Loads PDF using LangChain PDFLoader
   - Splits document into chunks
   - Creates embeddings using `gemini-embedding-001`
   - Stores vectors in Qdrant
3. User asks a question.
4. System:
   - Performs semantic similarity search (Top 3 chunks)
   - Injects retrieved context into system prompt
   - Sends request to Gemini 2.5 Flash
   - Returns answer strictly based on PDF context

---

## 🔐 AI Safety Logic

The system prompt ensures:

- AI answers **only from retrieved PDF chunks**
- Includes page numbers when available
- Does NOT hallucinate external knowledge
- Does NOT answer unrelated questions

---

## ⚙️ Environment Variables

Create a `.env` file inside the backend folder:

```
GOOGLE_API_KEY=your_google_api_key
QDRANT_URL=http://localhost:6333
```

---

## 🐳 Running with Docker (Recommended)

Make sure Docker is installed.

### Start Services

```bash
docker-compose up --build
```

This will start:
- Backend server
- Qdrant vector database

---

## 💻 Running Locally (Without Docker)

### 1️⃣ Start Qdrant

Run Qdrant locally:

```bash
docker run -p 6333:6333 qdrant/qdrant
```

---

### 2️⃣ Start Backend

```bash
cd cht
npm install
node server.js
```

Backend runs at:
```
http://localhost:3001
```

---

### 3️⃣ Start Frontend

```bash
cd docFin-fe
npm install
npm run dev
```

Frontend runs at:
```
http://localhost:5173
```

---

## 📡 API Endpoints

### Health Check
```
GET /api/health
```

### Upload PDF
```
POST /api/upload
```

### Check Indexing Status
```
GET /api/status/:jobId
```

### Chat with PDF
```
POST /api/chat
Body:
{
  "query": "Your question",
  "collectionName": "pdf-collection-id"
}
```

---

## 🖥 UI Highlights

- Minimalist document-style interface
- Desktop sidebar with session query history
- Mobile drawer navigation
- Progress bar for indexing
- Clean chat bubble interface
- Markdown-supported responses

---

## 🔄 Flow Diagram

```
User Upload → PDFLoader → Embeddings → Qdrant
User Query → Vector Search → Context Injection → Gemini → Response
```

---

## 🛠 Tech Stack Summary

| Layer       | Technology |
|------------|------------|
| Frontend   | React + Vite + Tailwind |
| Backend    | Node.js + Express |
| AI Model   | Gemini 2.5 Flash |
| Embeddings | Gemini Embeddings |
| Vector DB  | Qdrant |
| Container  | Docker |

---

## 📌 Future Improvements

- Persistent chat history (Database)
- Multi-document support
- Authentication system
- Streaming responses
- Production deployment setup
- Redis-based job tracking
- File size limits & validation improvements

---

## 🧑‍💻 Author

Harsh


---

## ⭐ If You Like This Project

Give it a ⭐ on GitHub and feel free to contribute!

---

# 🔥 DocFinder – Ask Your Documents Anything.