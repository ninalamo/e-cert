"use client";

import { useState } from "react";
import EmailTemplatePreviewDialog from "@/features/templates/components/email-template-preview-dialog";

export function useEmailPreview() {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("");
  const [name, setName] = useState("");

  const onPreview = (html: string, name: string) => {
    setHtml(html);
    setName(name);
    setOpen(true);
  };

  function PreviewDialog() {
    return (
      <EmailTemplatePreviewDialog open={open} onOpenChange={setOpen} html={html} name={name} />
    );
  }

  return { open, onPreview, PreviewDialog };
}