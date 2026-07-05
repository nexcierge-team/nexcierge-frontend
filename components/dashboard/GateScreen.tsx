"use client";

import { Button } from "@/components/ui/button";

// Full-screen gate shown instead of the dashboard when /api/am/inbox
// returns 401 (sign in), 403 (missing account_manager role), or fails.
export function GateScreen({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex h-screen items-center justify-center bg-white px-6">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white px-7 py-7 text-center shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Nexcierge · Account manager
        </div>
        <h1 className="mt-2 text-lg font-semibold tracking-[-0.01em] text-gray-900">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
        {actionLabel && onAction && (
          <Button
            type="button"
            variant="primary"
            className="mt-5"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
