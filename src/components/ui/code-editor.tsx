"use client";

import { useRef, useCallback } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  id?: string;
  readOnly?: boolean;
}

export default function CodeEditor({ value, onChange, rows = 16, id, readOnly = false }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const lineCount = value.split("\n").length;

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);

      requestAnimationFrame(() => {
        textarea.selectionStart = start + 2;
        textarea.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden font-mono text-sm">
      <div
        ref={lineNumbersRef}
        className="select-none text-right bg-[var(--color-surface-tertiary)] text-[var(--color-text-muted)] overflow-hidden shrink-0 py-2.5 pr-2 pl-3"
        style={{ minWidth: "3rem" }}
        aria-hidden="true"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="leading-[1.5]">
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        rows={rows}
        readOnly={readOnly}
        spellCheck={false}
        className="flex-1 bg-transparent text-[var(--color-text)] leading-[1.5] py-2.5 px-2 resize-none outline-none min-w-0"
      />
    </div>
  );
}
