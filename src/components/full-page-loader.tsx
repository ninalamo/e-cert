import { Loader2Icon } from "lucide-react";

interface FullPageLoaderProps {
  text?: string;
}

export function FullPageLoader({ text }: FullPageLoaderProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface-muted">
      <Loader2Icon className="size-10 animate-spin text-brand-600" aria-hidden="true" />
      {text ? (
        <p className="text-sm text-muted-foreground" role="status">
          {text}
        </p>
      ) : null}
    </div>
  );
}
