import { cn } from '../lib/utils';
import { AssetStatus } from '../types';

const statusConfig: Record<AssetStatus, { label: string; className: string }> = {
  good: { label: 'Bueno', className: 'bg-emerald-100 text-emerald-700' },
  regular: { label: 'Regular', className: 'bg-blue-100 text-blue-700' },
  bad: { label: 'Malo', className: 'bg-rose-100 text-rose-700' },
  maintenance: { label: 'Mantenimiento', className: 'bg-amber-100 text-amber-700' },
  decommissioned: { label: 'Baja Institucional', className: 'bg-slate-100 text-slate-700 border border-slate-300' },
  repaired: { label: 'Bueno · Reparado', className: 'bg-emerald-100 text-emerald-700 border border-emerald-300' },
  bodega: { label: 'Bodega (Almacenado)', className: 'bg-slate-100 text-slate-700 border border-slate-300' },
};

export default function StatusBadge({ status }: { status: AssetStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      config.className
    )}>
      {config.label}
    </span>
  );
}
