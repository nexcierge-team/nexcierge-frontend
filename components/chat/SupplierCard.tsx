import Image from "next/image";
import { Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SupplierMatch } from "@/types/chat";

interface SupplierCardProps {
  match: SupplierMatch;
}

export function SupplierCard({ match }: SupplierCardProps) {
  const [lo, hi] = match.priceRangeUsd;
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex">
        <div className="relative flex h-32 w-32 shrink-0 items-center justify-center border-r border-gray-200 bg-gray-50">
          {match.imageUrl ? (
            <Image
              src={match.imageUrl}
              alt={match.title}
              fill
              className="object-cover"
              sizes="128px"
            />
          ) : (
            <Box className="h-8 w-8 text-gray-300" strokeWidth={1.25} />
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {match.title}
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                MOQ {match.moq} · Lead time {match.leadTimeDays} days
              </div>
            </div>
            <div className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-900">
              ${(lo / 1000).toFixed(0)}–{(hi / 1000).toFixed(0)}k
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
            {match.specs.slice(0, 4).map((spec) => (
              <div key={spec.label} className="flex items-baseline gap-1.5">
                <dt className="text-gray-400">{spec.label}</dt>
                <dd className="font-medium text-gray-700">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 bg-[#F7F8FA] px-4 py-3">
        <Button size="sm" variant="secondary">
          View specs
        </Button>
        <Button size="sm" variant="ghost">
          Customize
        </Button>
        <Button size="sm" variant="accent" className="ml-auto">
          Request human review
        </Button>
      </div>
    </div>
  );
}
