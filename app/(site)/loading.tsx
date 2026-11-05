export default function Loading() {
  return (
    <div className="shell py-16">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="h-6 w-32 animate-pulse rounded-full bg-cream" />
          <div className="h-16 w-[86%] animate-pulse rounded-[18px] bg-cream" />
          <div className="h-16 w-[62%] animate-pulse rounded-[18px] bg-cream" />
          <div className="h-4 w-[70%] animate-pulse rounded-full bg-cream" />
          <div className="h-4 w-[54%] animate-pulse rounded-full bg-cream" />
          <div className="mt-6 flex gap-3">
            <div className="h-12 w-36 animate-pulse rounded-full bg-cream" />
            <div className="h-12 w-36 animate-pulse rounded-full bg-cream" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-[24px] edge/10 bg-cream"
            />
          ))}
        </div>
      </div>
      <div className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-[22px] edge/10 bg-cream"
          />
        ))}
      </div>
    </div>
  );
}
