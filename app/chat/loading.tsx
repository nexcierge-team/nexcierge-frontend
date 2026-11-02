import { ChatShellSkeleton } from "@/components/chat/ChatShellSkeleton";

// Instant feedback on client navigation to /chat (e.g. a homepage CTA)
// while the route's JS loads. See components/chat/ChatShellSkeleton.tsx.
export default function Loading() {
  return <ChatShellSkeleton />;
}
