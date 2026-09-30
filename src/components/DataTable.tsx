import React from 'react';
import { cn } from '../lib/utils';

export interface Column<T> {
  header: string;
  accessorKey: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export default function DataTable<T extends { id: string }>({ 
  data, 
  columns, 
  loading,
  onRowClick,
  emptyMessage = 'No se encontraron registros.'
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
        <p className="text-slate-500 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((column, idx) => (
                <th 
                  key={idx} 
                  className={cn(
                    "px-4 lg:px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap",
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item) => (
              <tr 
                key={item.id} 
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "hover:bg-slate-50/80 transition-colors",
                  onRowClick && "cursor-pointer active:bg-slate-100"
                )}
              >
                {columns.map((column, idx) => (
                  <td 
                    key={idx} 
                    className={cn(
                      "px-4 lg:px-6 py-4 text-sm text-slate-700",
                      column.className
                    )}
                  >
                    {typeof column.accessorKey === 'function' 
                      ? column.accessorKey(item) 
                      : (item[column.accessorKey] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
