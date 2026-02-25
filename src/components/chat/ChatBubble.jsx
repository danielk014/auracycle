import React from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Sparkles } from "lucide-react";

export default function ChatBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} items-end gap-2`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-200">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-br-sm shadow-md shadow-violet-200"
            : "bg-white border border-purple-50 text-slate-700 rounded-bl-sm shadow-sm"
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed">{message.content}</p>
        ) : (
          <ReactMarkdown
            className="text-sm leading-relaxed prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-1">{children}</p>,
              ul: ({ children }) => <ul className="my-1 ml-3 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="my-1 ml-3 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="my-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-violet-700">{children}</strong>,
              code: ({ children }) => <code className="bg-purple-50 text-purple-700 px-1 rounded text-xs">{children}</code>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white text-[10px] font-bold">You</span>
        </div>
      )}
    </motion.div>
  );
}
