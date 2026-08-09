import React from "react";
import { FileText, Sparkles, Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function EmptyState({
  hasIndexedDocs,
  indexedCount,
  handleFileSelect,
}) {
  if (hasIndexedDocs) {
    return (
      <div className="w-full max-w-[520px] mx-auto px-6 pt-[12vh] pb-12 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full flex flex-col items-center text-center font-sans"
        >
          {/* Sparkles Icon */}
          <div className="w-10 h-10 rounded-md bg-accent-light border border-accent-border flex items-center justify-center text-accent mb-4 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-white tracking-tight leading-snug">
            Ask questions about your documents
          </h2>
          {/* Subtitle description */}
          <p className="text-sm text-zinc-400 font-medium mt-2 leading-relaxed max-w-sm">
            Your {indexedCount} {indexedCount === 1 ? "document is" : "documents are"} ready. Ask anything and DocFinder will find relevant information from your uploaded PDFs.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[520px] mx-auto px-6 pt-[12vh] pb-12 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full flex flex-col items-center text-center font-sans"
      >
        {/* Document Icon (icon -> title: 16px) */}
        <div className="w-10 h-10 rounded-md bg-surface border border-border-strong flex items-center justify-center text-zinc-400 mb-4 flex-shrink-0">
          <FileText className="w-5 h-5" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-white tracking-tight leading-snug">
          Your documents, now searchable
        </h2>
        {/* Spacing title -> description: 8px */}
        <p className="text-sm text-zinc-400 font-medium mt-2 leading-relaxed max-w-sm">
          Upload PDFs and ask questions across your documents using AI-powered retrieval.
        </p>

        {/* Upload Action (description -> button: 20px) */}
        <div className="flex flex-col items-center mt-5">
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload-empty"
          />
          {/* Button: height 40px, padding 0 14px, radius 8px */}
          <label
            htmlFor="file-upload-empty"
            className="h-10 px-4 rounded-md bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload documents</span>
          </label>
          {/* Spacing button -> metadata: 10px */}
          <span className="text-xs text-zinc-500 font-medium mt-2.5">
            PDF up to 20 MB · Multiple files supported
          </span>
        </div>
      </motion.div>
    </div>
  );
}
