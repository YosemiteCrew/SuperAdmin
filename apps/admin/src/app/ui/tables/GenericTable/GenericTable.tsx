"use client";
import { useState, useMemo, type ReactNode } from "react";
import clsx from "clsx";
import "./GenericTable.css";

export type Column<T> = {
  label: string;
  key: keyof T | string;
  render?: (item: T, index: number) => ReactNode;
  width?: string;
};

type Props<T extends Record<string, unknown>> = {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  pagination?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  rowKey?: keyof T | ((item: T) => string);
};

export default function GenericTable<T extends Record<string, unknown>>({
  data,
  columns,
  onRowClick,
  pagination = false,
  pageSize = 10,
  emptyMessage = "No data available",
  rowKey: rowKeyProp,
}: Props<T>) {
  const getRowKey = (item: T, index: number): string => {
    if (rowKeyProp) {
      if (typeof rowKeyProp === "function") return rowKeyProp(item);
      return String(item[rowKeyProp]);
    }
    if ("id" in item) return String(item.id);
    if ("_id" in item) return String(item._id);
    return String(index);
  };

  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = pagination ? Math.ceil(data.length / pageSize) : 1;
  const safePage = useMemo(
    () => Math.min(currentPage, Math.max(1, totalPages)),
    [currentPage, totalPages]
  );
  const displayData = pagination
    ? data.slice((safePage - 1) * pageSize, safePage * pageSize)
    : data;

  const getValue = (item: T, key: keyof T | string): ReactNode => {
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
              key={getRowKey(item, rowIdx)}
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
                    ? col.render(item, (safePage - 1) * pageSize + rowIdx)
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
            Showing {(safePage - 1) * pageSize + 1}-
            {Math.min(safePage * pageSize, data.length)} of {data.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 rounded-xl border border-card-border text-caption-1 text-text-primary disabled:opacity-50 hover:border-brand-950 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={safePage === totalPages}
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
