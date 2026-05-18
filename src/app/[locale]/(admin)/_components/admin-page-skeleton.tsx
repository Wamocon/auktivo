export function AdminPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-32 rounded bg-zinc-100 dark:bg-zinc-800/60" />
      </div>
      {/* Card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-5 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 flex flex-col gap-3">
          <div className="h-10 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800/60" />
          <div className="h-10 w-full rounded-lg bg-zinc-100 dark:bg-zinc-800/60" />
          <div className="h-10 w-3/4 rounded-lg bg-zinc-100 dark:bg-zinc-800/60" />
        </div>
      </div>
      {/* Second card */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-800/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
