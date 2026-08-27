import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-muted p-4 text-center">
      <p className="font-heading text-6xl font-bold tracking-tight text-brand-700">
        404
      </p>
      <div>
        <h1 className="font-heading text-xl font-semibold text-[var(--color-text)]">
          Page not found
        </h1>
        <p className="mt-1 text-sm text-tertiary">
          The page you are looking for does not exist or may have been moved.
        </p>
      </div>
      <Link href="/" className="btn mt-2">
        Go home
      </Link>
    </div>
  );
}
