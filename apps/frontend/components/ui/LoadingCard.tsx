export function LoadingCard({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden py-2">
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
        <div
          key={i}
          className="flex-none w-[280px] rounded-xl overflow-hidden border border-neutral-200 animate-pulse"
        >
          <div className="h-[240px] bg-neutral-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-neutral-200 rounded w-3/4" />
            <div className="h-4 bg-neutral-200 rounded w-1/2" />
            <div className="h-3 bg-neutral-200 rounded w-1/3 mt-2" />
            <div className="flex gap-2 mt-4">
              <div className="h-9 bg-neutral-200 rounded flex-1" />
              <div className="h-9 bg-neutral-200 rounded flex-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
