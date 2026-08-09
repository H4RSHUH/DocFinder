import React from "react";
import { AlertCircle, X } from "lucide-react";
import { motion } from "framer-motion";

export default function ErrorToast({ error, onDismiss }) {
  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: -20, x: 20 }}
      className="absolute top-4 right-4 z-[99] max-w-sm w-auto bg-surface border border-danger/20 backdrop-blur-md p-3 rounded-md shadow-lg flex items-start gap-2.5"
    >
      <AlertCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white">System Alert</p>
        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed break-words font-normal">
          {error}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors flex-shrink-0 cursor-pointer"
        aria-label="Dismiss error"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
