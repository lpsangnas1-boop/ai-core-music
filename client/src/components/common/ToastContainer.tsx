import React from 'react';
import { useToast } from '../../hooks/useToast.js';
import { Music, CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-11 sm:top-12 right-4 z-[70] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let Icon = Info;
        let iconColor = 'text-[#1a2b88]';
        let iconBg = 'bg-[#a2b0ff]/25 border border-[#25385b]/30';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          iconColor = 'text-[#25385b]';
          iconBg = 'bg-[#a2b0ff]/30 border border-[#25385b]/30';
        } else if (toast.type === 'song') {
          Icon = Music;
          iconColor = 'text-[#1a2b88]';
          iconBg = 'bg-[#fffcef] border border-[#25385b]/40';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          iconColor = 'text-[#25385b]';
          iconBg = 'bg-[#ff8a7a]/25 border border-[#ff8a7a]/60';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'text-[#fffcef]';
          iconBg = 'bg-[#ff5a5a] border border-[#25385b]';
        }

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-[#fffcef] border border-[#25385b] shadow-recess-card text-[#25385b] animate-in fade-in slide-in-from-top-2 duration-150 transition-all"
          >
            <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${iconBg} ${iconColor}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate leading-tight text-[#25385b] font-sans">{toast.title}</div>
              {toast.message && (
                <div className="text-xs text-[#84849c] mt-0.5 line-clamp-2 leading-relaxed">
                  {toast.message}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#84849c] hover:text-[#25385b] p-1 rounded-lg hover:bg-[#a2b0ff]/20 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
