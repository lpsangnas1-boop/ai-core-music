import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Wifi } from 'lucide-react';
import type { NetworkInfo } from '../../types/index.js';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkInfo: NetworkInfo;
  serverName: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  networkInfo,
  serverName,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const requestUrl =
    typeof window !== 'undefined' && window.location.origin.startsWith('http')
      ? window.location.origin
      : networkInfo.url || 'http://localhost:8989';

  const handleCopy = () => {
    navigator.clipboard.writeText(requestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <span className="font-mono text-xs text-[#84849c]">connect_qr.modal</span>
          <button
            onClick={onClose}
            className="p-1.5 text-[#84849c] hover:text-[#25385b] hover:bg-[#a2b0ff]/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#a2b0ff]/20 text-[#25385b] text-[10px] font-mono font-bold uppercase border border-[#a2b0ff] mb-3">
            <Wifi className="w-3.5 h-3.5 text-[#3252f4]" />
            <span>Local Office Network</span>
          </div>

          <h3 className="font-sans text-lg sm:text-xl font-bold tracking-tight text-[#25385b] mb-1">
            Quét QR để Order
          </h3>
          <p className="text-xs text-[#84849c] mb-4">
            Dùng camera điện thoại quét mã QR để mở trang order nhạc
          </p>

          {/* QR Code Container Card */}
          <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#25385b]/30 inline-block mb-4 shadow-sm">
            <QRCodeSVG
              value={requestUrl}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#25385b"
              bgColor="#ffffff"
              imageSettings={{
                src: '/logo.png',
                x: undefined,
                y: undefined,
                height: 36,
                width: 36,
                excavate: true,
              }}
            />
          </div>

          {/* URL Box */}
          <div className="flex items-center justify-between gap-2 p-2 bg-[#ffffff] rounded-xl border border-[#25385b]/30 mb-4">
            <span className="text-xs text-[#25385b] font-mono truncate px-2 text-left select-all">
              {requestUrl}
            </span>
            <button
              onClick={handleCopy}
              className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 shrink-0 font-bold cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#fffcef]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>

          {/* Footer Action */}
          <div className="pt-3 border-t border-[#25385b]/15 flex items-center justify-between">
            <span className="text-[11px] text-[#84849c] font-mono truncate">
              • {serverName || 'AI Core music'}
            </span>
            <button
              onClick={onClose}
              className="btn-outline py-1.5 px-4 text-xs font-semibold cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
