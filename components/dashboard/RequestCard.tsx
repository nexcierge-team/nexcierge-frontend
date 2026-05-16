import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RequestStatus, SourcingRequest } from "@/types/dashboard";

const STATUS_STYLES: Record<RequestStatus, string> = {
  "Awaiting Specifications": "bg-gray-100 text-gray-700 ring-gray-200",
  "Supplier Matching": "bg-[#DCE8F8] text-[#0F2747] ring-[#BFD3F0]",
  "Quote Ready": "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Negotiating: "bg-amber-50 text-amber-700 ring-amber-100",
  Production: "bg-violet-50 text-violet-700 ring-violet-100",
  Shipped: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  Delivered: "bg-gray-100 text-gray-700 ring-gray-200",
};

interface RequestCardProps {
  request: SourcingRequest;
}

export function RequestCard({ request }: RequestCardProps) {
  return (
    <button className="group block w-full rounded-2xl border border-gray-200 bg-white p-5 text-left transition-all duration-200 hover:border-gray-300 hover:shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium tracking-[0.14em] text-gray-400">
            {request.id}
          </div>
          <div className="mt-1.5 text-base font-semibold text-gray-900">
            {request.title}
          </div>
          <div className="mt-0.5 text-sm text-gray-500">{request.category}</div>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
            STATUS_STYLES[request.status],
          )}
        >
          {request.status}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>
            <span className="text-gray-900 font-medium">
              {request.matchedSuppliers}
            </span>{" "}
            suppliers
          </span>
          <span>
            <span className="text-gray-900 font-medium">
              {request.quoteCount}
            </span>{" "}
            quotes
          </span>
          <span>Updated {request.updatedAt}</span>
        </div>
        <ArrowUpRight
          className="h-4 w-4 text-gray-300 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gray-900"
          strokeWidth={1.5}
        />
      </div>
    </button>
  );
}
