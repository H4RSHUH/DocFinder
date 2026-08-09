import React, { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const mapErrorResponse = (err, defaultMsg = "Something went wrong. Please try again later.") => {
  if (!err) return defaultMsg;
  // If the error object has a structured backend error code
  const code = err.code || err.error?.code;
  if (code) {
    switch (code) {
      case "RATE_LIMIT":
        return "You've reached the AI usage limit. Please try again later.";
      case "AUTH_ERROR":
        return "AI service is temporarily unavailable. Please try again later.";
      case "EMBEDDING_ERROR":
      case "INDEXING_ERROR":
        return "Couldn't process this document. Please try again later.";
      case "GENERATION_ERROR":
      case "SERVER_ERROR":
      default:
        return defaultMsg;
    }
  }

  // Fallback checks on messages or string contents
  const msg = (err.message || String(err)).toLowerCase();
  if (msg.includes("limit") || msg.includes("quota") || msg.includes("429")) {
    return "You've reached the AI usage limit. Please try again later.";
  }
  if (msg.includes("key") || msg.includes("auth") || msg.includes("403") || msg.includes("unauthorized") || msg.includes("unavailable")) {
    return "AI service is temporarily unavailable. Please try again later.";
  }
  if (msg.includes("process") || msg.includes("embed") || msg.includes("index") || msg.includes("pdf")) {
    return "Couldn't process this document. Please try again later.";
  }
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("connect")) {
    return "AI service is temporarily unavailable. Please try again later.";
  }
  return defaultMsg;
};

const App = () => {
  // ── Document State ──────────────────────────────────────────────────────
  const [documents, setDocuments] = useState([]);

  // ── Chat State (Conversations Grouped) ──────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  // ── UI State ────────────────────────────────────────────────────────────
  const [showSidebar, setShowSidebar] = useState(false);
  const [error, setError] = useState("");

  // ── Refs ────────────────────────────────────────────────────────────────
  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});

  // Active message thread derived from activeConversationId
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const messages = activeConversation ? activeConversation.messages : [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── Load existing documents on mount ────────────────────────────────────
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`);
      if (res.ok) {
        const data = await res.json();
        if (data.documents && data.documents.length > 0) {
          setDocuments(data.documents);
        }
      }
    } catch {
      // Backend server may not be reachable initially
    }
  };

  // ── File Upload ─────────────────────────────────────────────────────────
  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return;

    setError("");
    const formData = new FormData();
    const pdfFiles = Array.from(files).filter((f) => f.type === "application/pdf");

    if (pdfFiles.length === 0) {
      setError("Please select valid PDF files.");
      return;
    }

    for (const file of pdfFiles) {
      formData.append("pdfs", file);
    }

    // Deduplicate: set optimistic documents, replacing any existing entry with same fileName
    setDocuments((prev) => {
      const prevMap = new Map(prev.map((d) => [d.fileName || d.name, d]));
      for (const f of pdfFiles) {
        prevMap.set(f.name, {
          id: `temp-${Date.now()}-${f.name}`,
          docId: `temp-${Date.now()}-${f.name}`,
          name: f.name,
          fileName: f.name,
          size: (f.size / 1024).toFixed(1) + " KB",
          fileSize: f.size,
          chunks: 0,
          status: "uploading",
        });
      }
      return Array.from(prevMap.values());
    });

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw data.error || new Error("Upload failed");
      }

      // Merge backend returned indexed documents into state, replacing matching names
      if (data.documents && data.documents.length > 0) {
        setDocuments((prev) => {
          const updatedMap = new Map(
            prev.filter((d) => !d.docId?.startsWith("temp-")).map((d) => [d.fileName || d.name, d])
          );
          for (const doc of data.documents) {
            updatedMap.set(doc.fileName || doc.name, {
              ...doc,
              id: doc.id || doc.docId,
              docId: doc.docId || doc.id,
              name: doc.name || doc.fileName,
              fileName: doc.fileName || doc.name,
              status: "indexed",
            });
          }
          return Array.from(updatedMap.values());
        });
      }
    } catch (err) {
      const safeMsg = mapErrorResponse(err, "Couldn't process this document. Please try again later.");
      console.error("Upload error:", err);
      setError(safeMsg);

      // Mark matching temp/uploading documents as error
      setDocuments((prev) =>
        prev.map((d) =>
          d.status === "uploading" ? { ...d, status: "error", error: safeMsg } : d
        )
      );
    }
  };

  // ── Delete Document ─────────────────────────────────────────────────────
  const deleteDocument = async (docId) => {
    try {
      await fetch(`${API_BASE_URL}/api/documents/${docId}`, {
        method: "DELETE",
      });
      setDocuments((prev) => prev.filter((d) => (d.docId || d.id) !== docId));
    } catch {
      setError("Failed to delete document");
    }
  };

  // ── Chat ────────────────────────────────────────────────────────────────
  const indexedDocs = documents.filter((d) => d.status === "indexed");

  const cleanAndTruncateTitle = (text) => {
    if (!text) return "New Conversation";
    let title = text.trim();
    if (title.length > 35) {
      title = title.substring(0, 32).trim() + "...";
    }
    return title;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isChatting) return;
    if (indexedDocs.length === 0) {
      setError("No indexed documents available. Upload a PDF first.");
      return;
    }

    const userMsg = {
      id: Date.now(),
      role: "user",
      content: inputMessage,
    };

    let currentConvId = activeConversationId;
    let currentMessages = [...messages];
    const now = Date.now();

    // If starting a new conversation, create it first
    if (!currentConvId) {
      currentConvId = Date.now().toString();
      const title = cleanAndTruncateTitle(inputMessage);
      const newConv = {
        id: currentConvId,
        title,
        messages: [userMsg],
        createdAt: now,
        updatedAt: now,
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(currentConvId);
      currentMessages = [userMsg];
    } else {
      // Append userMsg to current active conversation and update timestamp
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConvId
            ? { ...c, messages: [...c.messages, userMsg], updatedAt: now }
            : c
        )
      );
      currentMessages = [...currentMessages, userMsg];
    }

    // Save conversational history slice prior to this request, filtering out error messages
    const historyPayload = messages
      .filter((msg) => !msg.isError)
      .slice(-10)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    setInputMessage("");
    setIsChatting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: inputMessage,
          docIds: indexedDocs.map((d) => d.docId || d.id),
          history: historyPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw data.error || new Error("Chat request failed");
      }

      const assistantMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.answer,
        sources: data.sources || [],
      };

      // Append assistantMsg to active conversation and update timestamp
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConvId
            ? { ...c, messages: [...c.messages, assistantMsg], updatedAt: Date.now() }
            : c
        )
      );
    } catch (err) {
      const safeMsg = mapErrorResponse(err, "Something went wrong. Please try again later.");
      console.error("Chat error:", err);
      setError(safeMsg);

      const errorMsg = {
        id: Date.now() + 1,
        role: "assistant",
        content: `Error: ${safeMsg}`,
        isError: true,
        sources: [],
      };

      // Append errorMsg to active conversation
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConvId
            ? { ...c, messages: [...c.messages, errorMsg], updatedAt: Date.now() }
            : c
        )
      );
    } finally {
      setIsChatting(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────
  const clearChat = () => {
    setActiveConversationId(null);
  };

  const handleFileSelect = (e) => {
    uploadFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    uploadFiles(Array.from(e.dataTransfer.files));
  };

  // Sort conversations list by updatedAt descending (newest activity FIRST)
  const sortedConversations = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-bg-app">
      <Sidebar
        documents={documents}
        uploadFiles={uploadFiles}
        deleteDocument={deleteDocument}
        handleFileSelect={handleFileSelect}
        handleDrop={handleDrop}
        conversations={sortedConversations}
        activeConversationId={activeConversationId}
        setActiveConversationId={setActiveConversationId}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        clearChat={clearChat}
      />
      <ChatArea
        messages={messages}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        sendMessage={sendMessage}
        isChatting={isChatting}
        indexedCount={indexedDocs.length}
        clearChat={clearChat}
        setShowSidebar={setShowSidebar}
        messagesEndRef={messagesEndRef}
        messageRefs={messageRefs}
        error={error}
        setError={setError}
        handleFileSelect={handleFileSelect}
      />
    </div>
  );
};

export default App;