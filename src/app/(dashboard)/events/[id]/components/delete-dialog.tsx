"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteEventAction } from "@/features/events/server/event.actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InfoIcon } from "lucide-react";

export default function DeleteDialog({
  event,
  open,
  onOpenChange,
}: {
  event: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const result = await deleteEventAction(event.id);
    setDeleting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.push("/events");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Event</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{event.name}</strong>?
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-[var(--color-danger-text)]" />
          <p className="text-[var(--color-danger-text)]">
            This will permanently delete the event along with all associated
            attendees and their issued certificates. This action cannot be undone.
          </p>
        </div>
        {error && (
          <p className="text-xs text-[var(--color-danger-text)]">{error}</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
