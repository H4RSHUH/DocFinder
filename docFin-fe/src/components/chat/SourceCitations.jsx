import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, FileText, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

export default function SourceCitations({ sources }) {
  // Group sources by (fileName, pageNumber)
  const uniqueRefs = [];
  const seenRefs = new Map();

  sources.forEach((src, originalIndex) => {
    // Standardize page number retrieval
    const page = src.pageNumber ?? src.page ?? 1;
    const fileName = src.fileName;
    const key = `${fileName}-p${page}`;

    if (seenRefs.has(key)) {
      const existingRef = seenRefs.get(key);
      existingRef.chunks.push({
        snippet: src.snippet,
        originalIndex,
      });
    } else {
      const newRef = {
        index: uniqueRefs.length + 1,
        fileName,
        pageNumber: page,
        chunks: [
          {
            snippet: src.snippet,
            originalIndex,
          },
        ],
      };
      uniqueRefs.push(newRef);
      seenRefs.set(key, newRef);
    }
  });

  if (uniqueRefs.length === 0) return null;

  return (
    <div className="pt-4 border-t border-border-subtle space-y-2.5">
      <div className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 px-0.5">
        <Link2 className="w-3.5 h-3.5 text-accent" />
        <span>Sources · {uniqueRefs.length}</span>
      </div>

      <div className="space-y-2 max-w-[560px]">
        {uniqueRefs.map((refItem) => (
          <SourceCard key={refItem.index} refItem={refItem} />
        ))}
      </div>
    </div>
  );
}

function SourceCard({ refItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const handleOpenSource = (e) => {
      if (e.detail && e.detail.refIndex === refItem.index) {
        setIsOpen(true);
        // Add highlighted class temporarily
        if (cardRef.current) {
          cardRef.current.classList.add("ring-1", "ring-accent");
          setTimeout(() => {
            cardRef.current?.classList.remove("ring-1", "ring-accent");
          }, 2000);
        }
      }
    };
    window.addEventListener("open-source-citation", handleOpenSource);
    return () => window.removeEventListener("open-source-citation", handleOpenSource);
  }, [refItem.index]);

  return (
    <div
      ref={cardRef}
      id={`source-card-${refItem.index}`}
      className="rounded-md border border-border-subtle bg-surface hover:border-border-strong hover:bg-surface-hover transition-all overflow-hidden scroll-mt-20"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-3 flex items-center justify-between text-xs cursor-pointer gap-2"
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <span className="font-bold text-accent text-sm leading-none">[{refItem.index}]</span>
          <FileText className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          <span className="truncate font-semibold text-zinc-200">{refItem.fileName}</span>
          {refItem.pageNumber != null && (
            <span className="text-[10px] text-zinc-500 font-semibold bg-bg-app px-1.5 py-0.5 rounded border border-border-subtle flex-shrink-0">
              p. {refItem.pageNumber}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-bg-app/40 border-t border-border-subtle p-3 space-y-3"
          >
            {refItem.chunks.map((chunk, cIdx) => (
              <div key={cIdx} className="space-y-1">
                {refItem.chunks.length > 1 && (
                  <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
                    Passage {cIdx + 1}
                  </div>
                )}
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Relevant Excerpt
                </div>
                <ExcerptViewer text={chunk.snippet} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExcerptViewer({ text }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  const limit = 160;
  const isLong = text.length > limit;

  // Truncate at nearest word to avoid cutting words
  const getPreview = (str) => {
    if (str.length <= limit) return str;
    const truncated = str.slice(0, limit);
    const lastSpace = truncated.lastIndexOf(" ");
    return (lastSpace > limit - 20 ? truncated.slice(0, lastSpace) : truncated).trim() + "...";
  };

  const previewText = getPreview(text);

  return (
    <div className="text-zinc-400 font-normal leading-relaxed text-[11px] mt-1">
      <div className="whitespace-pre-line">
        {isExpanded ? text : previewText}
      </div>
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-accent hover:underline mt-1.5 font-semibold text-[10px] cursor-pointer block"
        >
          {isExpanded ? "Show less ↑" : "View full excerpt →"}
        </button>
      )}
    </div>
  );
}
