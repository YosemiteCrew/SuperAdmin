"use client";
import { useState } from "react";
import clsx from "clsx";
import "./GenericTable.css";

export type Column<T> = {
  label: string;
  key: keyof T | string;
  render?: (item: T, index: number) => React.ReactNode;
  width?: string;
};

type Props<T extends Record<string, unknown>> = {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  pagination?: boolean;
  pageSize?: number;
  emptyMessage?: string;
};

export default function GenericTable<T extends Record<string, unknown>>({
  data,
  columns,
  onRowClick,
  pagination = false,
  pageSize = 10,
  emptyMessage = "No data available",
}: Props<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = pagination ? Math.ceil(data.length / pageSize) : 1;
  const displayData = pagination
    ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : data;

  const getValue = (item: T, key: keyof T | string): React.ReactNode => {
    const val = item[key as keyof T];
    if (val === null || val === undefined) return "";
    return String(val);
  };

  if (data.length === 0) {
    return (
      <div className="generic-table-wrapper">
        <div className="flex items-center justify-center py-12">
          <p className="text-body-4 text-text-tertiary">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="generic-table-wrapper">
      <table className="w-full">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="text-left text-caption-1 text-text-tertiary font-normal px-4 py-3"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((item, rowIdx) => (
            <tr
              key={rowIdx}
              onClick={() => onRowClick?.(item)}
              className={clsx(
                "generic-table-row",
                rowIdx < displayData.length - 1 && "generic-table-row-border",
                onRowClick && "generic-table-row-clickable"
              )}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className="text-body-4 text-text-primary font-medium px-4 py-3"
                >
                  {col.render
                    ? col.render(item, (currentPage - 1) * pageSize + rowIdx)
                    : getValue(item, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4 border-t border-card-border mt-2">
          <span className="text-caption-1 text-text-tertiary">
            Showing {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, data.length)} of {data.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-card-border text-caption-1 text-text-primary disabled:opacity-50 hover:border-brand-950 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-card-border text-caption-1 text-text-primary disabled:opacity-50 hover:border-brand-950 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
