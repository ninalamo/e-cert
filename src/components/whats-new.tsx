"use client";

import { useEffect, useRef, useState } from "react";
import { HelpCircleIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_PREFIX = "ecert:seen-whatsnew:";

const steps = [
  {
    title: "Your sidebar",
    body: "The menu on the left is your sidebar. It lists every area you can access — Dashboard, Events, Certificates, Templates, and (for admins) Users. Items are filtered to what your role allows.",
  },
  {
    title: "Create an event",
    body: "Open Events to set up a ceremony or activity with a name, date, and location. Certificates are always tied to an event.",
  },
  {
    title: "Design a template",
    body: "Under Templates you build the certificate layout — add text, the recipient name, and a signature area. Reuse it for any event.",
  },
  {
    title: "Issue certificates",
    body: "Open an event and use Issue to generate certificates for attendees. Upload a CSV to do it in bulk, then email them out.",
  },
  {
    title: "Verify anywhere",
    body: "Anyone can confirm a certificate at /verify using its certificate number — no login needed.",
  },
];

export default function WhatsNew({ userKey }: { userKey: string }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_PREFIX + userKey)) {
      setOpen(true);
    }
  }, [userKey]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function dismiss() {
    localStorage.setItem(STORAGE_PREFIX + userKey, "1");
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="How to use E-Cert"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="size-8"
      >
        <HelpCircleIcon className="size-4 text-tertiary" />
      </Button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="How to use E-Cert"
          className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-surface p-4 shadow-lg"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-primary">Welcome to E-Cert</h2>
              <p className="text-xs text-tertiary">
                A quick tour of what you can do.
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="rounded-md p-1 text-tertiary hover:bg-surface-hover"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-black">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-primary">{step.title}</p>
                  <p className="text-xs leading-relaxed text-tertiary">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <Button
            variant="brand"
            size="sm"
            onClick={dismiss}
            className="mt-4 w-full"
          >
            Got it
          </Button>
        </div>
      )}
    </div>
  );
}
