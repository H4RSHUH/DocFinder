import React from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function TypingIndicator() {
  return (
    <div className="w-full flex flex-col">
      {/* AI Identity Lockup */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-md bg-accent-light border border-accent-border flex items-center justify-center text-accent">
          <Sparkles className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold text-zinc-300">DocFinder</span>
      </div>

      {/* Pulsating Dots (pl-10 aligns dots exactly under "DocFinder" on desktop) */}
      <div className="pl-0 md:pl-10 mt-2 py-1.5 flex items-center gap-1">
        {[0, 0.15, 0.3].map((delay) => (
          <motion.div
            key={delay}
            className="w-1.5 h-1.5 bg-accent rounded-full"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay }}
          />
        ))}
      </div>
    </div>
  );
}
