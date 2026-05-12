export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex max-w-xl flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome to Your Project
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Edit{" "}
          <code className="rounded bg-zinc-200 px-2 py-1 text-sm font-mono dark:bg-zinc-800">
            src/app/page.tsx
          </code>{" "}
          to get started.
        </p>
        <div className="flex gap-4">
          <a
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Next.js Docs
          </a>
          <a
            className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            href="https://supabase.com/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Supabase Docs
          </a>
        </div>
      </main>
    </div>
  );
}
