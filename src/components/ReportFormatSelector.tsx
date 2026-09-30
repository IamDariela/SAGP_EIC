import { FileText, Check } from 'lucide-react';
import { ReportFormat } from '../lib/reports';
import { cn } from '../lib/utils';

interface ReportFormatSelectorProps {
  selectedFormat: ReportFormat;
  onFormatChange: (format: ReportFormat) => void;
  className?: string;
}

export default function ReportFormatSelector({ 
  selectedFormat, 
  onFormatChange, 
  className 
}: ReportFormatSelectorProps) {
  const formats: { id: ReportFormat; label: string; ext: string }[] = [
    { id: 'pdf', label: 'PDF', ext: '.pdf' },
    { id: 'docx', label: 'Word', ext: '.docx' },
    { id: 'xlsx', label: 'Excel', ext: '.xlsx' },
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      {formats.map((format) => {
        const isSelected = selectedFormat === format.id;
        
        let selectClass = "";
        let iconClass = "text-slate-400";
        let checkBgClass = "bg-primary";
        
        if (format.id === 'pdf') {
          selectClass = isSelected
            ? "border-red-600 bg-red-600 text-white shadow-lg ring-2 ring-red-600/10"
            : "border-slate-200 bg-white text-red-600 hover:border-red-600/40 shadow-sm";
          iconClass = isSelected ? "text-white" : "text-red-400";
          checkBgClass = "bg-red-600";
        } else if (format.id === 'docx') {
          selectClass = isSelected
            ? "border-primary bg-primary text-white shadow-lg ring-2 ring-primary/10"
            : "border-slate-200 bg-white text-primary hover:border-primary/40 shadow-sm";
          iconClass = isSelected ? "text-white" : "text-primary/60";
          checkBgClass = "bg-primary";
        } else if (format.id === 'xlsx') {
          selectClass = isSelected
            ? "border-emerald-600 bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-600/10"
            : "border-slate-200 bg-white text-emerald-600 hover:border-emerald-600/40 shadow-sm";
          iconClass = isSelected ? "text-white" : "text-emerald-400";
          checkBgClass = "bg-emerald-600";
        }

        return (
          <button
            key={format.id}
            type="button"
            onClick={() => onFormatChange(format.id)}
            className={cn(
              "flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all gap-2 min-h-[80px]",
              selectClass
            )}
          >
            <div className="relative">
              <FileText className={cn("h-6 w-6 sm:h-7 sm:w-7", iconClass)} />
              {isSelected && (
                <div className={cn("absolute -top-1.5 -right-1.5 text-white rounded-full p-0.5 shadow-md", checkBgClass)}>
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>
            <div className="flex flex-col items-center leading-none">
              <span className={cn("font-black text-[11px] sm:text-xs uppercase tracking-wider", isSelected ? "text-white" : "text-slate-600")}>
                {format.label}
              </span>
              <span className={cn("text-[9px] font-bold opacity-60 mt-0.5", isSelected ? "text-white/80" : "text-slate-400")}>({format.ext})</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
