import Link from "next/link";
import { SearchXIcon } from "lucide-react";

interface NotFoundStateProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function NotFoundState({
  title,
  description,
  backHref,
  backLabel,
}: NotFoundStateProps) {
  return (
    <div className="app-card p-12 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-surface-muted">
        <SearchXIcon className="size-5 text-tertiary" aria-hidden="true" />
      </div>
      <h2 className="font-heading text-lg font-semibold text-[var(--color-text)]">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-sm text-tertiary">{description}</p>
      ) : null}
      {backHref && backLabel ? (
        <div className="mt-6 flex justify-center">
          <Link href={backHref} className="btn">
            {backLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
