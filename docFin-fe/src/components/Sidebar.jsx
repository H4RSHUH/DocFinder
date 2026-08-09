import React from "react";
import {
  Sparkles,
  Trash2,
  Loader2,
  X,
  MessageSquare,
  FileText,
  FolderOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

export default function Sidebar({
  documents,
  deleteDocument,
  conversations = [],
  activeConversationId,
  setActiveConversationId,
  showSidebar,
  setShowSidebar,
  clearChat,
}) {
  const formatFileSize = (bytesOrString) => {
    if (!bytesOrString) return "—";
    if (typeof bytesOrString === "string") return bytesOrString;
    if (bytesOrString < 1024) return bytesOrString + " B";
    if (bytesOrString < 1024 * 1024) return (bytesOrString / 1024).toFixed(1) + " KB";
    return (bytesOrString / (1024 * 1024)).toFixed(1) + " MB";
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-bg-sidebar border-r border-border-strong w-[280px] p-4 flex-shrink-0 select-none overflow-hidden">
      {/* ── Brand Header (Height: 44px) ────────────────────────────────── */}
      <div className="flex items-center justify-between h-11 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-accent-light border border-accent-border flex items-center justify-center shadow-sm">
            <Sparkles className="text-accent w-4.5 h-4.5" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold text-white tracking-tight leading-tight">
              DocFinder
            </h1>
            <p className="text-[11px] text-zinc-500 font-medium tracking-wide">
              AI Document Workspace
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSidebar(false)}
          className="md:hidden p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-surface-hover transition-colors cursor-pointer"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Secondary CTA Action: New Conversation ─────────────────────── */}
      <div className="pt-4 pb-2 flex-shrink-0">
        {clearChat && (
          <button
            onClick={() => {
              clearChat();
              if (window.innerWidth < 768) setShowSidebar(false);
            }}
            className="w-full h-[38px] px-3.5 rounded-md bg-transparent hover:bg-surface-hover border border-border-strong text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
            <span>New conversation</span>
          </button>
        )}
      </div>

      {/* ── Scrollable Workspace Content (Section Gap: 24px) ───────────── */}
      <div className="flex-1 overflow-y-auto py-2 space-y-6 pr-0.5">
        {/* DOCUMENTS SECTION */}
        <div className="space-y-2">
          <div className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest px-1">
            Documents
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-6 px-3 rounded-md border border-dashed border-border-subtle bg-surface/20 text-zinc-500">
              <FolderOpen className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
              <p className="text-[11px] font-medium leading-normal">No files indexed</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {documents.map((doc) => {
                const docId = doc.docId || doc.id;
                const fileName = doc.fileName || doc.name;
                const fileSize = doc.fileSize || doc.size;
                const chunksCount = doc.chunks ?? doc.totalChunks ?? 0;

                return (
                  <div
                    key={docId || fileName}
                    className="group/doc flex items-center justify-between h-14 p-2 rounded-md bg-surface border border-border-subtle hover:bg-surface-hover hover:border-border-strong transition-colors gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
                      <div className="w-8 h-8 rounded bg-bg-app flex items-center justify-center border border-border-subtle flex-shrink-0">
                        <FileText className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-xs font-semibold text-zinc-200"
                          title={fileName}
                        >
                          {fileName}
                        </div>
                        <div
                          className={cn(
                            "text-[11px] mt-0.5 font-normal truncate",
                            doc.status === "error" ? "text-red-400" : "text-zinc-500"
                          )}
                          title={doc.status === "error" ? doc.error : undefined}
                        >
                          {formatFileSize(fileSize)} · {
                            doc.status === "indexed"
                              ? `${chunksCount} chunks`
                              : doc.status === "error"
                              ? `Indexing failed`
                              : "Indexing..."
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center flex-shrink-0">
                      <div className="group-hover/doc:hidden">
                        {doc.status === "indexed" ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        ) : doc.status === "error" ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                        ) : (
                          <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
                        )}
                      </div>

                      <button
                        onClick={() => deleteDocument(docId)}
                        className="hidden group-hover/doc:flex p-1 rounded hover:bg-danger-light text-zinc-400 hover:text-danger transition-colors cursor-pointer"
                        title="Delete document"
                        aria-label={`Delete ${fileName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CONVERSATIONS SECTION */}
        <div className="space-y-2">
          <div className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest px-1">
            Conversations
          </div>

          {conversations.length === 0 ? (
            <p className="text-[11px] text-zinc-650 italic px-1 font-medium">
              No recent chats
            </p>
          ) : (
            <div className="space-y-1">
              {conversations.map((c) => {
                const isActive = c.id === activeConversationId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveConversationId(c.id);
                      if (window.innerWidth < 768) setShowSidebar(false);
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-2 rounded-md text-xs font-semibold truncate flex items-center gap-2.5 transition-colors cursor-pointer group",
                      isActive
                        ? "bg-surface-hover text-white border border-border-strong"
                        : "text-zinc-400 hover:text-white hover:bg-surface-hover/30 border border-transparent"
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-500 group-hover:text-accent flex-shrink-0" />
                    <span className="truncate flex-1">{c.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Version Block ──────────────────────────────────────── */}
      <div className="mt-auto pt-4 border-t border-border-subtle flex-shrink-0">
        <div className="text-center text-[10px] text-zinc-600 font-semibold tracking-wider">
          v1.0.0 · QDRANT VECTOR DB
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block h-full flex-shrink-0">{sidebarContent}</div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-[280px] z-50 md:hidden shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
