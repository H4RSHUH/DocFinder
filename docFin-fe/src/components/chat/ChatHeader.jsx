import React from "react";
import { Menu, Plus, RotateCcw } from "lucide-react";

export default function ChatHeader({
  indexedCount,
  messagesCount,
  clearChat,
  setShowSidebar,
  handleFileSelect,
}) {
  return (
    <header className="px-4 py-3 bg-bg-app border-b border-border-strong flex flex-col gap-3 sticky top-0 z-20 flex-shrink-0 w-full md:h-16 md:px-6 md:py-0 md:flex-row md:items-center md:justify-between">
      {/* Top Row: Hamburger, Title & Clear */}
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(true)}
            className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white rounded-md hover:bg-surface-hover transition-colors cursor-pointer flex-shrink-0"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-400 tracking-tight leading-tight">
              <span className="text-zinc-500">Workspace</span>
              <span className="text-zinc-600 font-normal">/</span>
              <span className="text-zinc-200">Documents</span>
            </div>
            <p className="text-xs text-zinc-500 font-medium mt-0.5 leading-none">
              {indexedCount} {indexedCount === 1 ? "document" : "documents"} indexed
            </p>
          </div>
        </div>

        {/* Clear Button on Mobile */}
        {messagesCount > 0 && (
          <button
            onClick={clearChat}
            className="md:hidden h-9 px-2 text-zinc-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0"
            title="Clear conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Bottom/Actions Row on Mobile, Right Actions on Desktop */}
      <div className="flex items-center gap-3 w-full md:w-auto md:justify-end">
        {/* Clear Button on Desktop Only */}
        {messagesCount > 0 && (
          <button
            onClick={clearChat}
            className="hidden md:flex h-10 px-2 text-zinc-500 hover:text-zinc-200 text-sm font-semibold transition-colors cursor-pointer items-center gap-1.5"
            title="Clear conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}

        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload-header"
        />
        <label
          htmlFor="file-upload-header"
          className="h-10 px-3.5 rounded-md bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer w-full md:w-auto text-center"
        >
          <Plus className="w-4 h-4" />
          <span>Upload documents</span>
        </label>
      </div>
    </header>
  );
}
