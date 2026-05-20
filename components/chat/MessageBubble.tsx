"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/chat";
import { SupplierCard } from "./SupplierCard";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "flex max-w-[88%] flex-col gap-3",
          isUser ? "items-end" : "items-start",
        )}
      >
        {message.content && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
              isUser
                ? "bg-gray-900 text-white whitespace-pre-wrap"
                : "bg-white border border-gray-200 text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
            )}
          >
            {isUser ? (
              message.content
            ) : (
              <AgentMarkdown content={message.content} />
            )}
          </div>
        )}

        {message.supplierCards && message.supplierCards.length > 0 && (
          <div className="grid w-full gap-3">
            {message.supplierCards.map((s) => (
              <SupplierCard key={s.id} match={s} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}


function AgentMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0F2747] underline underline-offset-2 hover:text-[#1D4ED8] transition-colors"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.85em] text-gray-800">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto rounded-lg bg-gray-100 p-3 font-mono text-[13px] text-gray-800">
            {children}
          </pre>
        ),
        h1: ({ children }) => (
          <h1 className="mt-3 mb-2 text-base font-semibold text-gray-900">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-3 mb-2 text-base font-semibold text-gray-900">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-2 mb-1 text-[15px] font-semibold text-gray-900">
            {children}
          </h3>
        ),
        hr: () => <hr className="my-3 border-gray-200" />,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-gray-300 pl-3 italic text-gray-700">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}


export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start"
    >
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <span className="inline-flex items-end gap-1">
          {[0, 0.15, 0.3].map((d) => (
            <span
              key={d}
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
              style={{ animationDelay: `${d}s` }}
            />
          ))}
        </span>
      </div>
    </motion.div>
  );
}
