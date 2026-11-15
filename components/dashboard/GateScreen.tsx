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
    <div className="flex h-screen items-center justify-center bg-paper px-6">
      <div className="max-w-md rounded-none border-[1.5px] border-ink bg-sheet px-7 py-7 text-center">
        <div className="type-data text-xs font-semibold text-ink-soft">
          Nexcierge · Account manager
        </div>
        <h1 className="type-title mt-2 text-lg font-bold text-ink">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
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
