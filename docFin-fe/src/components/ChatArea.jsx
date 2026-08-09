import React, { useState, useEffect, useRef } from "react";
import ChatHeader from "./chat/ChatHeader";
import EmptyState from "./chat/EmptyState";
import MessageBubble from "./chat/MessageBubble";
import TypingIndicator from "./chat/TypingIndicator";
import ChatInput from "./chat/ChatInput";
import ErrorToast from "./chat/ErrorToast";
import { AnimatePresence } from "framer-motion";

export default function ChatArea({
  messages,
  inputMessage,
  setInputMessage,
  sendMessage,
  isChatting,
  indexedCount,
  clearChat,
  setShowSidebar,
  messagesEndRef,
  messageRefs,
  error,
  setError,
  handleFileSelect,
}) {
  const [composerHeight, setComposerHeight] = useState(180);
  const composerRef = useRef(null);

  // Measure actual composer heights dynamically to prevent overlapping
  useEffect(() => {
    if (!composerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setComposerHeight(entry.target.clientHeight);
      }
    });
    resizeObserver.observe(composerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className="flex-grow flex h-full bg-bg-app relative overflow-hidden font-sans">
      {/* ── Left Chat Column (Main Scroll Viewport) ───────────────────── */}
      <div className="flex-1 flex flex-col h-full bg-bg-app relative min-w-0 overflow-hidden">
        {/* Toast Notification */}
        <AnimatePresence>
          {error && (
            <ErrorToast error={error} onDismiss={() => setError("")} />
          )}
        </AnimatePresence>

        {/* Sticky Header Bar (Height: 64px) */}
        <ChatHeader
          indexedCount={indexedCount}
          messagesCount={messages.length}
          clearChat={clearChat}
          setShowSidebar={setShowSidebar}
          handleFileSelect={handleFileSelect}
        />

        {/* Message Thread Scroll Area */}
        <div
          className="flex-grow overflow-y-auto w-full pt-6 scroll-smooth flex flex-col"
          style={{ paddingBottom: `${composerHeight + 40}px` }}
        >
          <div className="max-w-[820px] w-full mx-auto px-6 flex-1 flex flex-col justify-start">
            {messages.length === 0 ? (
              <EmptyState
                hasIndexedDocs={indexedCount > 0}
                indexedCount={indexedCount}
                handleFileSelect={handleFileSelect}
              />
            ) : (
              <div className="space-y-8 w-full">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    ref={(el) => (messageRefs.current[msg.id] = el)}
                    className="w-full"
                  >
                    <MessageBubble message={msg} />
                  </div>
                ))}

                {isChatting && (
                  <div className="w-full">
                    <TypingIndicator />
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} className="h-4 flex-shrink-0" />
          </div>
        </div>

        {/* Dynamic Height Chat Input Composer */}
        <ChatInput
          ref={composerRef}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          sendMessage={sendMessage}
          isChatting={isChatting}
          hasIndexedDocs={indexedCount > 0}
          handleFileSelect={handleFileSelect}
        />
      </div>
    </div>
  );
}
