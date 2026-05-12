---
applyTo: "**/*.tsx,**/*.ts,**/*.jsx,**/*.js"
---
# Next.js 16 + App Router Instructions

## Server vs. Client Components

- Default to **Server Components** (no directive needed).
- Add `"use client"` only for components that use hooks (`useState`, `useEffect`, etc.), event handlers, or browser APIs.
- Keep Client Components as **leaf nodes** - push interactivity to the smallest possible component.

## Async APIs (Next.js 16 Breaking Change)

In Next.js 16, the following are **async** and must be awaited:

```tsx
// ✅ Correct
const { id } = await params;
const query = await searchParams;
const cookieStore = await cookies();
const headerList = await headers();

// ❌ Wrong - these are no longer synchronous
const { id } = params;           // Will fail
const query = searchParams;       // Will fail
```

## Data Fetching

- Fetch data in Server Components using `async/await`.
- Use Server Actions (`"use server"`) for data mutations.
- Use `Suspense` boundaries with `loading.tsx` for granular loading states.
- Handle errors with `error.tsx` (client-side error boundary).

## Routing

- Use `layout.tsx` for shared UI across routes.
- Use `page.tsx` for route-specific content.
- Use `route.ts` for API routes (Route Handlers).
- Use dynamic routes: `[id]/page.tsx` and catch-all: `[...slug]/page.tsx`.

## Metadata & SEO

- Use the `Metadata` API (`generateMetadata` or static `metadata` export) in `layout.tsx` or `page.tsx`.
- Never use `<Head>` from `next/head` - that is Pages Router only.

## Optimisation

- Use `next/image` for images (automatic optimisation).
- Use `next/font` for fonts (zero layout shift).
- Use `next/link` for client-side navigation.
- Prefer `next/dynamic` for code-splitting heavy Client Components.
