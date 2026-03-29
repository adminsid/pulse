'use client';

import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  rowKey?: keyof T | ((item: T) => string | number);
}

export default function DataTable<T>({
  data,
  columns,
  isLoading,
  onRowClick,
  emptyMessage = 'No data found.',
  rowKey,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full bg-card border border-border rounded-xl p-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full bg-card border border-border rounded-xl p-12 text-center text-muted text-sm italic">
        {emptyMessage}
      </div>
    );
  }

  const getRowKey = (item: T, index: number): string | number => {
    if (typeof rowKey === 'function') return rowKey(item);
    if (rowKey && item[rowKey]) return item[rowKey] as unknown as string | number;
    return (item as any).id || index;
  };

  return (
    <div className="w-full overflow-x-auto bg-card border border-border rounded-xl border-collapse">
      <table className="w-full text-sm text-left">
        <thead className="text-[10px] uppercase tracking-wider text-muted font-bold border-b border-border bg-muted-fg/5">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={`px-4 py-3 font-bold ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((item, index) => (
            <tr
              key={getRowKey(item, index)}
              onClick={() => onRowClick?.(item)}
              className={`${
                onRowClick ? 'cursor-pointer hover:bg-muted-fg/5 transition-colors' : ''
              }`}
            >
              {columns.map((col, i) => (
                <td key={i} className={`px-4 py-3.5 text-fg ${col.className || ''}`}>
                  {typeof col.accessor === 'function'
                    ? col.accessor(item)
                    : (item[col.accessor] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

