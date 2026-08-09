import React from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles } from "lucide-react";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end w-full animate-fadeIn font-sans">
        <div className="max-w-[85%] md:max-w-[70%] bg-surface border border-border-strong text-zinc-100 px-3.5 py-2.5 rounded-xl rounded-tr-none text-sm leading-relaxed shadow-sm font-medium">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col animate-fadeIn font-sans">
      {/* AI Identity Lockup */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-md bg-accent-light border border-accent-border flex items-center justify-center text-accent">
          <Sparkles className="w-4 h-4" />
        </div>
        <span className="text-sm font-semibold text-zinc-300">DocFinder</span>
      </div>

      {/* AI Answer Content (pl-10 aligns text exactly under "DocFinder" on desktop) */}
      <div className="pl-0 md:pl-10 mt-3 md:mt-2 max-w-full md:max-w-[90%]">
        <div className={`prose-chat max-w-none ${message.isError ? "text-red-400 font-medium border border-red-950/30 bg-red-950/10 px-3.5 py-2.5 rounded-lg" : "text-zinc-100"}`}>
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
