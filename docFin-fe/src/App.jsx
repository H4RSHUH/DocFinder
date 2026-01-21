import React, { useState, useEffect, useRef } from 'react';
import { Upload, MessageCircle, Loader2, File, Send, CheckCircle, XCircle } from 'lucide-react';

const App = () => {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, processing, ready, error
  const [collectionName, setCollectionName] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

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
      const response = await fetch('http://localhost:3001/api/upload', {
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
        const response = await fetch(`http://localhost:3001/api/status/${jobId}`);
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

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsChatting(true);

    try {
      // Replace with your actual API endpoint
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: inputMessage,
          collectionName: collectionName,
        }),
      });

      if (!response.ok) throw new Error('Chat failed');

      const data = await response.json();
      const assistantMessage = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError('Failed to get response. Make sure backend is running.');
      const errorMessage = { role: 'assistant', content: 'Sorry, I encountered an error.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatting(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">RAG PDF Chat</h1>
          <p className="text-gray-600">Upload a PDF and chat with its content</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <XCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Section */}
        {uploadStatus === 'idle' && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="bg-white rounded-lg shadow-lg p-12 text-center border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors"
          >
            <Upload className="mx-auto mb-4 text-indigo-500" size={48} />
            <h2 className="text-2xl font-semibold mb-2">Upload your PDF</h2>
            <p className="text-gray-600 mb-6">Drag and drop or click to browse</p>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors"
            >
              Select PDF
            </label>
          </div>
        )}

        {/* Processing Section */}
        {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Loader2 className="mx-auto mb-4 text-indigo-500 animate-spin" size={48} />
            <h2 className="text-2xl font-semibold mb-2">
              {uploadStatus === 'uploading' ? 'Uploading...' : 'Indexing PDF...'}
            </h2>
            <p className="text-gray-600 mb-6">
              {file?.name}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">{Math.round(progress)}% complete</p>
          </div>
        )}

        {/* Chat Section */}
        {uploadStatus === 'ready' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Chat Header */}
            <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File size={20} />
                <span className="font-semibold truncate max-w-xs">{file?.name}</span>
              </div>
              <button
                onClick={resetApp}
                className="px-3 py-1 bg-white text-indigo-600 rounded hover:bg-indigo-50 transition-colors text-sm"
              >
                New PDF
              </button>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-20">
                  <MessageCircle className="mx-auto mb-2" size={48} />
                  <p>Ask me anything about your PDF!</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-800 shadow'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-lg shadow">
                    <Loader2 className="animate-spin text-indigo-600" size={20} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask a question about your PDF..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isChatting}
                />
                <button
                  onClick={sendMessage}
                  disabled={isChatting || !inputMessage.trim()}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;