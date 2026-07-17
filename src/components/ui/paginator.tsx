"use client";

import { useState, useEffect } from "react";

export function usePagination<T>(items: T[], defaultPageSize: number = 10) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginatedItems = items.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize
  );

  useEffect(() => {
    Promise.resolve().then(() => {
      if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
    });
  }, [items.length, pageSize, page, totalPages]);

  return {
    page: safePage,
    totalPages,
    pageSize,
    paginatedItems,
    setPage,
    setPageSize,
  };
}

const ROWS_OPTIONS = [10, 25, 50, 100];

export function Paginator({
  page,
  totalPages,
  pageSize,
  totalItems,
  setPage,
  setPageSize,
  showSizeSelector = true,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  setPage: (p: number) => void;
  setPageSize?: (s: number) => void;
  showSizeSelector?: boolean;
}) {
  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 sm:px-6 pt-3 pb-1">
      <div className="flex items-center gap-2 text-xs text-tertiary">
        {showSizeSelector && setPageSize && (
          <>
            <span className="hidden sm:inline">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="input text-xs w-auto py-1"
            >
              {ROWS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-tertiary w-full sm:w-auto justify-between sm:justify-normal">
        <span>
          {page * pageSize + 1}–
          {Math.min((page + 1) * pageSize, totalItems)} of {totalItems}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-2 rounded border border-default bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded border border-default bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
