import React, { useState, useEffect, useRef } from 'react';
import { Upload, MessageCircle, Loader2, File, Send, CheckCircle, XCircle } from 'lucide-react';
import ReactMarkdown from "react-markdown";

const App = () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, processing, ready, error
  const [collectionName, setCollectionName] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const [showHistory, setShowHistory] = useState(false);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulate backend API calls (replace with actual API calls)
  const uploadPDF = async (file) => {
    setUploadStatus('uploading');
    setError('');
    
    const formData = new FormData();
    formData.append('pdf', file);
    
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setCollectionName(data.collectionName);
      
      // Start polling for status
      pollIndexingStatus(data.jobId);
    } catch (err) {
      setError('Failed to upload PDF. Make sure backend is running.');
      setUploadStatus('error');
    }
  };

  const pollIndexingStatus = async (jobId) => {
    setUploadStatus('processing');
    let attempts = 0;
    const maxAttempts = 60; // 1 minute timeout
    
    const interval = setInterval(async () => {
      try {
        // Replace with your actual API endpoint
        const response = await fetch(`${API_BASE_URL}/api/status/${jobId}`);
        const data = await response.json();
        
        setProgress(data.progress || 0);
        
        if (data.status === 'completed') {
          clearInterval(interval);
          setUploadStatus('ready');
          setProgress(100);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setUploadStatus('error');
          setError('PDF indexing failed');
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setUploadStatus('error');
          setError('Indexing timeout');
        }
      } catch (err) {
        clearInterval(interval);
        setUploadStatus('error');
        setError('Failed to check status');
      }
    }, 1000);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      uploadPDF(selectedFile);
    } else {
      setError('Please select a valid PDF file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      uploadPDF(droppedFile);
    } else {
      setError('Please drop a valid PDF file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isChatting) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsChatting(true);

    try {
      // Replace with your actual API endpoint
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: inputMessage,
          collectionName: collectionName,
        }),
      });

      if (!response.ok) throw new Error('Chat failed');

      const data = await response.json();
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError('Failed to get response. Make sure backend is running.');
      const errorMessage = { role: 'assistant', content: 'Sorry, I encountered an error.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatting(false);
    }
  };

  const messageRefs = useRef({});
  const scrollToMessage = (id) => {
    messageRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const resetApp = () => {
    setFile(null);
    setUploadStatus('idle');
    setCollectionName('');
    setMessages([]);
    setInputMessage('');
    setProgress(0);
    setError('');
  };

  // return (
  //   // <div className="min-h-screen bg-black bg-gradient-to-br from-blue-50 to-indigo-100">
  //   //   <div className="h-screen flex flex-col">
  //   //     {/* Header */}
  //   //     <div className="text-center mb-8">
  //   //       <h1 className="text-4xl font-bold text-gray-800 mb-2">RAG PDF Chat</h1>
  //   //       <p className="text-gray-600">Upload a PDF and chat with its content</p>
  //   //     </div>

  //   //     {/* Error Display */}
  //   //     {error && (
  //   //       <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
  //   //         <XCircle size={20} />
  //   //         <span>{error}</span>
  //   //       </div>
  //   //     )}

  //   //     {/* Upload Section */}
  //   //     {uploadStatus === 'idle' && (
  //   //       <div
  //   //         onDrop={handleDrop}
  //   //         onDragOver={handleDragOver}
  //   //         className="bg-gray-900 text-white rounded-lg shadow-lg p-12 text-center border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors"
  //   //       >
  //   //         <Upload className="mx-auto mb-4 text-indigo-500" size={48} />
  //   //         <h2 className="text-2xl font-semibold mb-2">Upload your PDF</h2>
  //   //         <p className="text-gray-600 mb-6">Drag and drop or click to browse</p>
  //   //         <input
  //   //           type="file"
  //   //           accept="application/pdf"
  //   //           onChange={handleFileSelect}
  //   //           className="hidden"
  //   //           id="file-upload"
  //   //         />
  //   //         <label
  //   //           htmlFor="file-upload"
  //   //           className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors"
  //   //         >
  //   //           Select PDF
  //   //         </label>
  //   //       </div>
  //   //     )}

  //   //     {/* Processing Section */}
  //   //     {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
  //   //       <div className="bg-white rounded-lg shadow-lg p-12 text-center">
  //   //         <Loader2 className="mx-auto mb-4 text-indigo-500 animate-spin" size={48} />
  //   //         <h2 className="text-2xl font-semibold mb-2">
  //   //           {uploadStatus === 'uploading' ? 'Uploading...' : 'Indexing PDF...'}
  //   //         </h2>
  //   //         <p className="text-gray-600 mb-6">
  //   //           {file?.name}
  //   //         </p>
  //   //         <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
  //   //           <div
  //   //             className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
  //   //             style={{ width: `${progress}%` }}
  //   //           ></div>
  //   //         </div>
  //   //         <p className="text-sm text-gray-500">{Math.round(progress)}% complete</p>
  //   //       </div>
  //   //     )}

  //   //     {/* Chat Section */}
  //   //     {uploadStatus === 'ready' && (
  //   //       <div className="bg-gray-900 text-white rounded-lg shadow-lg overflow-hidden">
  //   //         {/* Chat Header */}
  //   //         <div className="bg-black text-white p-4 flex items-center justify-between">
  //   //           <div className="flex items-center gap-2">
  //   //             <File size={20} />
  //   //             <span className="font-semibold truncate max-w-xs">{file?.name}</span>
  //   //           </div>
  //   //           <button
  //   //             onClick={resetApp}
  //   //             className="px-3 py-1 bg-white text-black rounded hover:bg-indigo-50 transition-colors text-sm"
  //   //           >
  //   //             New PDF
  //   //           </button>
  //   //         </div>

  //   //         {/* Messages */}
  //   //         <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-800">
  //   //           {messages.length === 0 && (
  //   //             <div className="text-center text-gray-500 mt-20">
  //   //               <MessageCircle className="mx-auto mb-2" size={48} />
  //   //               <p>Ask me anything about your PDF!</p>
  //   //             </div>
  //   //           )}
  //   //           {messages.map((msg, idx) => (
  //   //             <div
  //   //               key={idx}
  //   //               className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
  //   //             >
  //   //               <div
  //   //                 className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
  //   //                   msg.role === 'user'
  //   //                     ? 'bg-gray-700 text-white'
  //   //                     : 'bg-gray-500 text-gray-800 shadow'
  //   //                 }`}
  //   //               >
  //   //                 {msg.content}
  //   //               </div>
  //   //             </div>
  //   //           ))}
  //   //           {isChatting && (
  //   //             <div className="flex justify-start">
  //   //               <div className="bg-white px-4 py-3 rounded-lg shadow">
  //   //                 <Loader2 className="animate-spin text-indigo-600" size={20} />
  //   //               </div>
  //   //             </div>
  //   //           )}
  //   //           <div ref={messagesEndRef} />
  //   //         </div>

  //   //         {/* Input */}
  //   //         <div className="p-4 border-t">
  //   //           <div className="flex gap-2">
  //   //             <input
  //   //               type="text"
  //   //               value={inputMessage}
  //   //               onChange={(e) => setInputMessage(e.target.value)}
  //   //               onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
  //   //               placeholder="Ask a question about your PDF..."
  //   //               className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
  //   //               disabled={isChatting}
  //   //             />
  //   //             <button
  //   //               onClick={sendMessage}
  //   //               disabled={isChatting || !inputMessage.trim()}
  //   //               className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
  //   //             >
  //   //               <Send size={20} />
  //   //             </button>
  //   //           </div>
  //   //         </div>
  //   //       </div>
  //   //     )}
  //   //   </div>
  //   // </div>
    
  // );

  return (
<div className="h-screen flex flex-col md:flex-row bg-[#f5f5f2]">
    {/* ================= DESKTOP SIDEBAR ================= */}
    <div className="hidden md:flex w-64 bg-[#f0efe9] border-r border-[#e2e1dc] p-6 flex-col overflow-y-auto">
      <h1 className="text-lg font-semibold text-gray-800 mb-6">
        DocFinder
      </h1>

      {uploadStatus === "idle" && (
        <>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="desktop-file-upload"
          />
          <label
            htmlFor="desktop-file-upload"
            className="block text-center text-sm py-2 px-4 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-100 transition"
          >
            Upload PDF
          </label>
        </>
      )}

      {(uploadStatus === "uploading" || uploadStatus === "processing") && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 truncate">
            {file?.name}
          </p>
          <div className="h-1.5 bg-gray-200 rounded-full">
            <div
              className="h-1.5 bg-black rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {uploadStatus === "ready" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 truncate">
            {file?.name}
          </p>
          <button
            onClick={resetApp}
            className="text-sm py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-100 transition"
          >
            New PDF
          </button>
        </div>
      )}

      {/* SESSION QUERIES */}
      <div className="mt-8 overflow-y-auto space-y-2">
        <div className="border-t border-gray-200 my-4"></div>
        <p className="text-xs px-10 font-medium text-gray-500 mb-2">
          Session Queries
        </p>

        {messages
            .filter((msg) => msg.role === "user")
            .map((msg) => (
              <button
                key={msg.id}
                onClick={() => scrollToMessage(msg.id)}
                className="text-left text-xs px-3 py-2 rounded-md border border-transparent hover:bg-[#e7e6e0] hover:border-gray-200 transition truncate w-full"
              >
                {msg.content}
              </button>
            ))}
      </div>
    </div>

    

    {/* ================= CHAT AREA ================= */}
    <div className="flex-1 flex flex-col h-full min-h-0">

      <div className="md:hidden px-4 pt-4 mb-4 flex justify-between items-center">
        <button
          onClick={() => setShowHistory(true)}
          className="text-3xl"
        >
          ☰
        </button>
        <h1 className="text-2xl font-semibold text-gray-800 px-8">
          DocFinder
        </h1>
      </div>
      {/* ================= MESSAGES ================= */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 md:px-8 py-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm">
              {uploadStatus === "ready"
                ? "Ask anything about your document."
                : "Upload a PDF to begin."}
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              ref={(el) => (messageRefs.current[msg.id] = el)}
              className={`flex ${
                msg.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-full sm:max-w-md px-4 py-3 rounded-xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-black text-white"
                    : "bg-[#ebeae6] bg- border border-gray-300 text-gray-800"
                }`}
              >
                <ReactMarkdown>
                {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {isChatting && (
            <div className="text-gray-400 text-sm">
              Thinking...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ================= MOBILE FILE STATUS ================= */}
      <div className="block md:hidden px-4 pb-2">
        {(uploadStatus === "uploading" ||
          uploadStatus === "processing") && (
          <div className="text-xs text-gray-600 space-y-1">
            <p className="truncate">{file?.name}</p>
            <div className="h-1 bg-gray-200 rounded-full">
              <div
                className="h-1 bg-black rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {uploadStatus === "ready" && (
          <div className="flex items-center justify-between bg-[#f5f5f2] border border-gray-200 rounded-md px-3 py-2 text-xs">
            <span className="truncate">{file?.name}</span>
            <button
              onClick={resetApp}
              className="text-gray-500"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ================= INPUT ================= */}
      <div className="px-4 sm:px-6 md:px-8 pb-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center bg-[#f5f5f2] border border-gray-300 rounded-full px-4 py-2 shadow-sm">

            {/* MOBILE PLUS BUTTON */}
            <div className="block md:hidden mr-2">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="mobile-file-upload"
              />
              <label
                htmlFor="mobile-file-upload"
                className="text-xl cursor-pointer text-gray-600"
              >
                +
              </label>
            </div>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && sendMessage()
              }
              placeholder="Ask a question..."
              disabled={
                uploadStatus !== "ready" || isChatting
              }
              className="flex-1 bg-transparent outline-none text-sm"
            />

            <button
              onClick={sendMessage}
              disabled={
                uploadStatus !== "ready" ||
                isChatting ||
                !inputMessage.trim()
              }
              className="ml-3 text-sm font-medium cursor-pointer text-gray-600 hover:text-black transition disabled:opacity-50"
            >
              Send
            </button>

          </div>
        </div>
      </div>

    </div>

    {showHistory && (
  <div className="fixed inset-0 z-50 flex">
    
    {/* Overlay */}
    <div
      className="absolute inset-0 bg-black/30"
      onClick={() => setShowHistory(false)}
    />

    {/* Drawer */}
    <div className="relative w-80 bg-[#f0efe9]  h-full p-6 overflow-y-auto shadow-lg">

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-medium">Session History</p>
        <button onClick={() => setShowHistory(false)}>✕</button>
      </div>

      {messages
        .filter((msg) => msg.role === "user")
        .map((msg) => (
          <button
            key={msg.id}
            onClick={() => {
              scrollToMessage(msg.id);
              setShowHistory(false);
            }}
            className="block w-full  text-left text-sm px-3 py-3 rounded-md hover:bg-[#e7e6e0] truncate"
          >
            {msg.content}
          </button>
        ))}

    </div>
  </div>
)}
  </div>
);

};

export default App;