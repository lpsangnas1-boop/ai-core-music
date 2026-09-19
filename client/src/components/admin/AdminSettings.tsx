import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Save,
  Loader2,
  Clock,
  UserCheck,
  Repeat,
  Radio,
  Eye,
  Shield,
} from 'lucide-react';
import type { JukeboxSettings } from '../../types/index.js';

interface AdminSettingsProps {
  settings: JukeboxSettings;
  onUpdateSettings: (partial: Partial<JukeboxSettings>) => Promise<any>;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [form, setForm] = useState<JukeboxSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateSettings(form);
    } catch (e) {
      // error handled in toast
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#fffcef] border border-[#25385b] rounded-2xl shadow-recess-card overflow-hidden max-w-2xl mx-auto text-[#25385b]">
      {/* Window Title Bar */}
      <div className="h-10 bg-[#eef0ff] border-b border-[#25385b] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff8a7a] border border-[#25385b]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#a2b0ff] border border-[#25385b]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#25385b]" />
        </div>
        <span className="font-mono text-xs text-[#84849c]">settings.conf</span>
        <div className="w-6" />
      </div>

      <div className="p-6 sm:p-7">
        <div className="flex items-center gap-3 mb-5 pb-3.5 border-b border-[#25385b]/15">
          <div className="w-9 h-9 rounded-xl bg-[#a2b0ff]/30 border border-[#25385b] text-[#25385b] flex items-center justify-center shadow-recess">
            <SlidersHorizontal className="w-4.5 h-4.5 text-[#25385b]" />
          </div>
          <div>
            <h2 className="font-sans text-base sm:text-lg font-bold uppercase tracking-tight text-[#25385b]">
              Cấu hình Jukebox
            </h2>
            <p className="text-xs text-[#84849c]">
              Quản lý quy tắc hàng đợi, thời gian chờ chống spam và chế độ lặp lại
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server Name */}
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#84849c] mb-1.5">
              Tên hiển thị Jukebox
            </label>
            <input
              type="text"
              value={form.serverName}
              onChange={(e) => setForm({ ...form, serverName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#ffffff] border border-[#25385b]/30 text-[#25385b] text-xs sm:text-sm focus:outline-none focus:border-[#25385b] focus:ring-2 focus:ring-[#a2b0ff]/50 transition-all"
              placeholder="VD: AI Core music"
            />
          </div>

          {/* Request Permissions Toggle */}
          <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#25385b]/20 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <Radio className="w-4 h-4 text-[#1a2b88] shrink-0" />
              <div>
                <div className="text-xs sm:text-sm font-bold text-[#25385b]">Nhận bài từ đồng nghiệp (Guest Requests)</div>
                <div className="text-[11px] text-[#84849c]">
                  Khi tắt, đồng nghiệp sẽ không thể order bài mới vào hàng đợi.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, requestsEnabled: !form.requestsEnabled })}
              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
                form.requestsEnabled ? 'bg-[#25385b] justify-end' : 'bg-[#84849c]/30 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-[#fffcef] border border-[#25385b]/30 shadow-sm transform transition-transform" />
            </button>
          </div>

          {/* Cooldown Seconds */}
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#84849c] mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#ff8a7a]" />
              <span>Thời gian chờ giữa 2 lần order (Giây)</span>
            </label>
            <p className="text-[11px] text-[#84849c] mb-1.5">
              Thời gian tối thiểu 1 thiết bị phải chờ trước khi order bài tiếp theo.
            </p>
            <input
              type="number"
              min="0"
              max="3600"
              value={form.requestCooldownSeconds}
              onChange={(e) =>
                setForm({ ...form, requestCooldownSeconds: parseInt(e.target.value, 10) || 0 })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#ffffff] border border-[#25385b]/30 text-[#25385b] text-xs sm:text-sm font-mono focus:outline-none focus:border-[#25385b] focus:ring-2 focus:ring-[#a2b0ff]/50 transition-all"
            />
          </div>

          {/* Max Requests Per Device */}
          <div>
            <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#84849c] mb-1 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#1a2b88]" />
              <span>Số bài tối đa trong hàng đợi cho mỗi thiết bị</span>
            </label>
            <p className="text-[11px] text-[#84849c] mb-1.5">
              Ngăn một người order quá nhiều bài cùng lúc chiếm sóng văn phòng.
            </p>
            <input
              type="number"
              min="1"
              max="20"
              value={form.maxRequestsPerDevice}
              onChange={(e) =>
                setForm({ ...form, maxRequestsPerDevice: parseInt(e.target.value, 10) || 1 })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#ffffff] border border-[#25385b]/30 text-[#25385b] text-xs sm:text-sm font-mono focus:outline-none focus:border-[#25385b] focus:ring-2 focus:ring-[#a2b0ff]/50 transition-all"
            />
          </div>

          {/* Loop Default Playlist Toggle */}
          <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#25385b]/20 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <Repeat className="w-4 h-4 text-[#ff8a7a] shrink-0" />
              <div>
                <div className="text-xs sm:text-sm font-bold text-[#25385b]">Lặp lại Playlist mặc định</div>
                <div className="text-[11px] text-[#84849c]">
                  Tự động quay lại bài số 1 khi phát hết danh sách mặc định.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, loopDefaultPlaylist: !form.loopDefaultPlaylist })
              }
              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
                form.loopDefaultPlaylist ? 'bg-[#25385b] justify-end' : 'bg-[#84849c]/30 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-[#fffcef] border border-[#25385b]/30 shadow-sm transform transition-transform" />
            </button>
          </div>

          {/* Show Requester Names Toggle */}
          <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#25385b]/20 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <Eye className="w-4 h-4 text-[#1a2b88] shrink-0" />
              <div>
                <div className="text-xs sm:text-sm font-bold text-[#25385b]">Hiển thị tên người order cho mọi người</div>
                <div className="text-[11px] text-[#84849c]">
                  Hiện nhãn người order bài trên giao diện khách và danh sách chờ.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, showRequesterNames: !form.showRequesterNames })
              }
              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
                form.showRequesterNames ? 'bg-[#25385b] justify-end' : 'bg-[#84849c]/30 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-[#fffcef] border border-[#25385b]/30 shadow-sm transform transition-transform" />
            </button>
          </div>

          {/* Volume Normalization Toggle */}
          <div className="p-3.5 rounded-xl bg-[#ffffff] border border-[#25385b]/20 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-[#1a2b88] shrink-0" />
              <div>
                <div className="text-xs sm:text-sm font-bold text-[#25385b]">Giữ âm lượng đều (Volume Normalizer)</div>
                <div className="text-[11px] text-[#84849c]">
                  Tự động giảm 18% âm lượng khi phát các bài Remix / Vinahouse / Phonk / Bass để chống giật mình cả phòng.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, volumeNormalization: !form.volumeNormalization })
              }
              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 cursor-pointer ${
                form.volumeNormalization ? 'bg-[#25385b] justify-end' : 'bg-[#84849c]/30 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-[#fffcef] border border-[#25385b]/30 shadow-sm transform transition-transform" />
            </button>
          </div>

          {/* Save CTA */}
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary w-full py-3 px-4 rounded-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-recess disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu cấu hình</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
