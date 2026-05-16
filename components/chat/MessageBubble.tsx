import { motion } from "framer-motion";
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
      <div className={cn("flex max-w-[88%] flex-col gap-3", isUser ? "items-end" : "items-start")}>
        {message.content && (
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap",
              isUser
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
            )}
          >
            {message.content}
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
