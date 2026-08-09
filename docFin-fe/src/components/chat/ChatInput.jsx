import React, { useState } from "react";
import { AlertCircle, Send, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

export default function ChatInput({
  ref,
  inputMessage,
  setInputMessage,
  sendMessage,
  isChatting,
  hasIndexedDocs,
  handleFileSelect,
}) {
  const [showWarning, setShowWarning] = useState(false);

  const triggerWarning = () => {
    if (!hasIndexedDocs) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 4000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!hasIndexedDocs) {
      triggerWarning();
      return;
    }
    if (inputMessage.trim() && !isChatting) {
      sendMessage();
    }
  };

  return (
    <div
      ref={ref}
      className="fixed bottom-0 left-0 md:left-[280px] right-0 bg-gradient-to-t from-bg-app via-bg-app/90 to-transparent pt-4 px-6 pb-5 z-10 flex-shrink-0"
    >
      <div className="max-w-[820px] w-full mx-auto relative flex flex-col">
        <AnimatePresence>
          {showWarning && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3.5 py-2 rounded-md bg-warning/10 border border-warning/20 text-warning text-xs font-semibold flex items-center gap-1.5 shadow-xl backdrop-blur-md whitespace-nowrap"
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Upload at least one PDF to start asking questions...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Composer Card Input */}
        <div
          className={cn(
            "relative flex flex-col w-full bg-surface border rounded-[12px] transition-all shadow-lg p-4 min-h-[110px]",
            hasIndexedDocs
              ? "border-border-strong focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/20"
              : "border-border-subtle opacity-60 cursor-not-allowed"
          )}
          onClick={triggerWarning}
        >
          {/* Textarea Input (Auto-grow, comfortable vertical positioning, padding bottom to avoid overlap) */}
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasIndexedDocs || isChatting}
            placeholder={
              hasIndexedDocs
                ? "Ask anything about your documents..."
                : "Upload a PDF first to begin..."
            }
            rows={1}
            className="w-full bg-transparent border-0 outline-none resize-none text-sm text-white placeholder-zinc-500 pb-12 min-h-[44px] max-h-40 leading-relaxed font-normal"
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
            }}
          />

          {/* Bottom Actions Area */}
          <div className="flex items-center justify-between mt-auto pt-2 flex-shrink-0">
            {/* Attachment/upload button at bottom-left */}
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload-composer"
            />
            <label
              htmlFor="file-upload-composer"
              className="w-8 h-8 rounded-md bg-transparent hover:bg-surface-hover border border-border-subtle flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer flex-shrink-0"
              title="Upload documents"
            >
              <Plus className="w-4 h-4" />
            </label>

            {/* Send button at bottom-right */}
            <button
              onClick={handleSend}
              disabled={!hasIndexedDocs || isChatting || !inputMessage.trim()}
              className={cn(
                "w-9 h-9 rounded-md flex items-center justify-center transition-colors cursor-pointer flex-shrink-0",
                hasIndexedDocs && inputMessage.trim() && !isChatting
                  ? "bg-accent hover:bg-accent-hover text-white shadow-sm"
                  : "bg-white/5 text-zinc-650 cursor-not-allowed"
              )}
              aria-label="Send query"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center mt-2 text-[11px] text-zinc-500 font-semibold tracking-wide">
          Answers are generated from your indexed documents.
        </p>
      </div>
    </div>
  );
}
