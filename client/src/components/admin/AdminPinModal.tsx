import React, { useState } from 'react';
import { KeyRound, ArrowRight, Loader2, X, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../hooks/useToast.js';

interface AdminPinModalProps {
  isOpen: boolean;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await api.verifyAdmin(pin.trim());
      addToast({ type: 'success', title: 'DJ Access Granted', message: 'Chào mừng bạn đến với DJ Station!' });
      onSuccess(pin.trim());
    } catch (err: any) {
      setError(err.message || 'Mã PIN không chính xác');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#0a0a3a]/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-[#fffcef] border border-[#25385b] rounded-2xl shadow-recess-card overflow-hidden text-center text-[#25385b]">
        {/* Window Title Bar */}
        <div className="h-9 sm:h-10 bg-[#eef0ff] border-b border-[#25385b] flex items-center justify-between px-3 sm:px-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff8a7a] border border-[#25385b]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#a2b0ff] border border-[#25385b]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#25385b]" />
          </div>
          <span className="font-mono text-xs text-[#84849c]">admin_auth.modal</span>
          <button
            onClick={onCancel}
            className="p-1.5 text-[#84849c] hover:text-[#25385b] hover:bg-[#a2b0ff]/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#a2b0ff]/20 text-[#25385b] text-[10px] font-mono font-bold uppercase border border-[#a2b0ff] mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#3252f4]" />
            <span>DJ Admin Access</span>
          </div>

          <h3 className="font-sans text-lg sm:text-xl font-bold tracking-tight text-[#25385b] mb-1">
            Mở khóa DJ Station
          </h3>
          <p className="text-xs text-[#84849c] mb-5">
            Nhập mã PIN Admin để toàn quyền quản lý danh sách và phát nhạc
          </p>

          <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-[#a2b0ff]/15 border border-[#25385b] space-y-3.5 mb-4 shadow-xs">
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(null);
                }}
                placeholder="Nhập mã PIN..."
                autoFocus
                className="w-full text-center py-2.5 px-4 rounded-xl bg-[#ffffff] border border-[#25385b]/30 text-[#25385b] text-lg font-mono tracking-widest focus:outline-hidden focus:border-[#25385b] focus:ring-2 focus:ring-[#a2b0ff]/50 transition-all placeholder:text-xs placeholder:tracking-normal placeholder:text-[#84849c]"
              />
            </div>

            {error && (
              <p className="text-xs text-[#ff5a5a] font-semibold animate-in fade-in">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !pin.trim()}
              className="btn-primary w-full py-2.5 px-4 disabled:opacity-50 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-recess"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Xác nhận & Mở khóa</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer Action */}
          <div className="pt-3 border-t border-[#25385b]/15 flex items-center justify-between">
            <span className="text-[11px] text-[#84849c] font-mono truncate">
              • Quản trị viên
            </span>
            <button
              type="button"
              onClick={onCancel}
              className="btn-outline py-1.5 px-4 text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
