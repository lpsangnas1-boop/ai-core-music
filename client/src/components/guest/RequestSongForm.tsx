import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Link2,
  PlusCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Clipboard,
  Sparkles,
  Search,
  X,
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useToast } from '../../hooks/useToast.js';
import { AVATAR_OPTIONS } from '../../hooks/useDeviceId.js';
import type { VideoMetadata, JukeboxSettings, SearchResultItem } from '../../types/index.js';

interface RequestSongFormProps {
  onRequestSong: (url: string, requesterName: string, shoutout?: string) => Promise<{ position: number; message: string }>;
  requesterName: string;
  onSaveRequesterName: (name: string) => void;
  userAvatar?: string;
  onSaveUserAvatar?: (avatar: string) => void;
  deviceId: string;
  settings: JukeboxSettings;
}

function isYouTubeUrl(input: string): boolean {
  return /youtu\.?be/i.test(input) || /^[a-zA-Z0-9_-]{11}$/.test(input.trim());
}

export const RequestSongForm: React.FC<RequestSongFormProps> = ({
  onRequestSong,
  requesterName,
  onSaveRequesterName,
  userAvatar = '🐱',
  onSaveUserAvatar,
  deviceId,
  settings,
}) => {
  const { addToast } = useToast();

  const [inputQuery, setInputQuery] = useState('');
  const [name, setName] = useState(requesterName);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [preview, setPreview] = useState<VideoMetadata | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderingId, setOrderingId] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<{ position: number; message: string } | null>(null);

  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [canRequestReason, setCanRequestReason] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setName(requesterName);
  }, [requesterName]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const checkEligibility = async () => {
      if (!deviceId) return;
      try {
        const result = await api.canRequest(deviceId);
        if (!result.allowed) {
          setCanRequestReason(result.reason || 'Tạm dừng nhận bài mới');
          if (result.retryAfter) {
            setCooldownRemaining(result.retryAfter);
          }
        } else {
          setCanRequestReason(null);
          setCooldownRemaining(0);
        }
      } catch (e) {
        console.warn('Check request status failed:', e);
      }
    };

    checkEligibility();

    timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          checkEligibility();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [deviceId]);

  // Handle URL metadata preview OR keyword search
  useEffect(() => {
    const trimmed = inputQuery.trim();

    if (!trimmed) {
      setPreview(null);
      setPreviewError(null);
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Direct YouTube URL mode
    if (isYouTubeUrl(trimmed)) {
      setSearchResults([]);
      setIsSearching(true);
      setPreviewError(null);

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const meta = await api.getMetadata(trimmed);
          setPreview(meta);
          setPreviewError(null);
        } catch (err: any) {
          setPreview(null);
          setPreviewError(err.message || 'Không tìm thấy video YouTube');
        } finally {
          setIsSearching(false);
        }
      }, 500);
    } else {
      // Keyword search mode (Search by song title / artist)
      setPreview(null);
      setPreviewError(null);
      setIsSearching(true);

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const results = await api.searchYouTube(trimmed);
          setSearchResults(results);
        } catch (err: any) {
          console.warn('Search failed:', err);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 400);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputQuery]);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputQuery(text.trim());
        }
      }
    } catch (e) {
      // clipboard access fallback
    }
  };

  const executeOrder = async (songUrlOrId: string) => {
    const rawClean = name.trim() || 'Ẩn danh';
    const finalName = rawClean.startsWith(userAvatar || '🐱') ? rawClean : `${userAvatar || '🐱'} ${rawClean}`;
    onSaveRequesterName(rawClean);

    setIsSubmitting(true);
    try {
      const fullUrl = isYouTubeUrl(songUrlOrId)
        ? songUrlOrId
        : `https://www.youtube.com/watch?v=${songUrlOrId}`;

      const res = await onRequestSong(fullUrl, finalName);
      setSuccessBanner(res);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#5865f2', '#57f287', '#00b0f4', '#eb459e'],
        });
      } catch (e) {}

      setInputQuery('');
      setPreview(null);
      setSearchResults([]);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Không thể order bài',
        message: err.message || 'Vui lòng thử lại',
      });
    } finally {
      setIsSubmitting(false);
      setOrderingId(null);
    }
  };

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim()) {
      addToast({ type: 'warning', title: 'Vui lòng nhập tên bài hát hoặc dán link YouTube' });
      return;
    }
    executeOrder(inputQuery.trim());
  };

  const isLocked = !settings.requestsEnabled || cooldownRemaining > 0;

  return (
    <div className="p-4 sm:p-6 bg-[#ffffff]/85 backdrop-blur-md border-1.5 border-[#25385b] rounded-2xl shadow-recess-card text-[#25385b]">
      <div className="flex items-center gap-2 sm:gap-2.5 pb-3 mb-4 sm:mb-5 border-b border-[#25385b]/20">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#a2b0ff] text-[#25385b] border border-[#25385b] flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#25385b]" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-runde text-sm sm:text-base font-extrabold uppercase tracking-wider text-[#25385b]">
            Order bài hát
          </h2>
          <p className="text-[11px] sm:text-xs text-[#84849c] truncate">
            Tìm theo tên bài hát hoặc dán link YouTube để phát qua loa
          </p>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="mb-4 sm:mb-5 p-3 sm:p-3.5 bg-[#f0fdf4] border border-[#10b981] rounded-xl flex items-start gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#10b981] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-[#25385b]">Order bài hát thành công!</h4>
            <p className="text-[11px] sm:text-xs text-[#84849c] mt-0.5">{successBanner.message}</p>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-[#84849c] hover:text-[#25385b] text-xs font-bold px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Cooldown / Limit Warning Banner */}
      {isLocked && canRequestReason && (
        <div className="mb-4 sm:mb-5 p-3 sm:p-3.5 bg-[#fff1f2] border border-[#ff5a5a] rounded-xl flex items-center gap-2.5 sm:gap-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#ff5a5a] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#ff5a5a]">{canRequestReason}</p>
            {cooldownRemaining > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-[#ff5a5a] font-mono mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Có thể order tiếp sau: {cooldownRemaining}s</span>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitUrl} className="space-y-3.5 sm:space-y-4">
        {/* Requester Name Input & Avatar Picker */}
        <div>
          <label className="block text-[11px] font-bold text-[#25385b] uppercase tracking-wider mb-1.5 font-mono">
            Tên & Avatar của bạn
          </label>
          <div className="relative flex items-center">
            {/* Avatar Trigger Button */}
            <button
              type="button"
              onClick={() => setIsAvatarPickerOpen(!isAvatarPickerOpen)}
              className="absolute left-1.5 z-10 flex items-center gap-0.5 sm:gap-1 text-sm sm:text-base px-1.5 sm:px-2 py-1 rounded-full bg-[#fffcef] hover:bg-[#f0f3ff] border border-[#25385b] transition-all cursor-pointer shadow-xs"
              title="Bấm để chọn icon đại diện"
            >
              <span>{userAvatar || '🐱'}</span>
              <span className="text-[9px] text-[#84849c]">▼</span>
            </button>

            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                onSaveRequesterName(e.target.value);
              }}
              placeholder="VD: Sang, Shun, Alex..."
              maxLength={30}
              className="w-full pl-14 sm:pl-16 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm bg-[#fffcef] border border-[#25385b] rounded-lg focus:outline-hidden focus:border-[#3252f4] text-[#25385b] placeholder-[#84849c] transition-colors"
            />

            {/* Avatar Picker Dropdown */}
            {isAvatarPickerOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-40 p-2 sm:p-2.5 bg-[#ffffff] border border-[#25385b] rounded-xl shadow-lg grid grid-cols-6 gap-1.5 sm:gap-2 animate-in fade-in zoom-in-95 max-w-[calc(100vw-3rem)] sm:max-w-xs">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      onSaveUserAvatar?.(av);
                      setIsAvatarPickerOpen(false);
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-lg sm:text-xl hover:bg-[#f0f3ff] hover:scale-110 transition-all cursor-pointer ${
                      userAvatar === av ? 'bg-[#a2b0ff]/40 border border-[#25385b]' : ''
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Universal Search & Paste Input */}
        <div>
          <label className="block text-[11px] font-bold text-[#25385b] uppercase tracking-wider mb-1.5 font-mono">
            Tên bài hát hoặc Link YouTube
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none text-[#84849c]">
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#3252f4]" />
              ) : isYouTubeUrl(inputQuery) ? (
                <Link2 className="w-4 h-4 text-[#3252f4]" />
              ) : (
                <Search className="w-4 h-4 text-[#84849c]" />
              )}
            </div>
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Tìm bài hát hoặc dán link YouTube..."
              disabled={isLocked || isSubmitting}
              className="w-full pl-9 sm:pl-10 pr-16 sm:pr-20 py-2 sm:py-2.5 text-xs sm:text-sm bg-[#fffcef] border border-[#25385b] rounded-lg focus:outline-hidden focus:border-[#3252f4] text-[#25385b] placeholder-[#84849c] transition-colors disabled:opacity-50"
            />

            {/* Quick Actions inside input */}
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
              {inputQuery ? (
                <button
                  type="button"
                  onClick={() => setInputQuery('')}
                  className="p-1 rounded-md text-[#84849c] hover:text-[#25385b] hover:bg-[#a2b0ff]/20 cursor-pointer"
                  title="Xóa nội dung"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="px-2 py-1 text-[10px] sm:text-[11px] font-semibold text-[#25385b] hover:bg-[#f0f3ff] bg-[#ffffff] border border-[#25385b] rounded-md flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                  title="Dán từ Clipboard"
                >
                  <Clipboard className="w-3 h-3 text-[#3252f4]" />
                  <span className="hidden xs:inline sm:inline">Dán</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* YouTube Direct Link Preview Card */}
        {preview && (
          <div className="p-2.5 sm:p-3 bg-[#fffcef] border border-[#25385b] rounded-xl flex items-center gap-2.5 sm:gap-3.5 animate-in fade-in duration-150 shadow-xs">
            <img
              src={preview.thumbnail}
              alt={preview.title}
              className="w-14 h-10 sm:w-16 sm:h-12 object-cover rounded-md border border-[#25385b] bg-[#fffcef] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-[#25385b] truncate" title={preview.title}>
                {preview.title}
              </h4>
              <p className="text-[11px] text-[#84849c] truncate mt-0.5 font-medium">
                {preview.channel}
              </p>
            </div>
            <button
              type="submit"
              disabled={isLocked || isSubmitting}
              className="shrink-0 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-[#25385b] hover:bg-[#3252f4] text-[#ffffff] text-xs font-bold rounded-lg border border-[#25385b] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlusCircle className="w-3.5 h-3.5 text-[#ffffff]" />
              )}
              <span>Order</span>
            </button>
          </div>
        )}

        {previewError && (
          <div className="p-2.5 bg-[#fff1f2] border border-[#ff5a5a] rounded-lg text-xs text-[#ff5a5a] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{previewError}</span>
          </div>
        )}

        {/* Search Results List (Keyword search mode) */}
        {searchResults.length > 0 && !preview && (
          <div className="space-y-2 pt-1 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-bold text-[#25385b]">
              <span>Kết quả tìm kiếm ({searchResults.length}):</span>
              <span className="text-[11px] font-normal text-[#84849c]">Bấm để order 1-Click</span>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
              {searchResults.map((item) => {
                const isItemOrdering = isSubmitting && orderingId === item.youtubeId;
                return (
                  <div
                    key={item.youtubeId}
                    className="p-2 sm:p-2.5 rounded-xl bg-[#fffcef] hover:bg-[#f0f3ff] border border-[#25385b]/30 hover:border-[#25385b] flex items-center gap-2.5 sm:gap-3 transition-colors group shadow-xs"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-14 h-10 sm:w-16 sm:h-11 rounded-md overflow-hidden border border-[#25385b] bg-[#fffcef] shrink-0">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      {item.durationText && (
                        <span className="absolute bottom-0.5 right-0.5 bg-[#25385b]/90 text-[#ffffff] text-[8px] sm:text-[9px] font-mono px-1 rounded-xs">
                          {item.durationText}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4
                        className="text-xs sm:text-sm font-bold text-[#25385b] truncate group-hover:text-[#3252f4] transition-colors"
                        title={item.title}
                      >
                        {item.title}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-[#84849c] truncate mt-0.5 font-medium">
                        {item.channel}
                      </p>
                    </div>

                    {/* Instant Order Button */}
                    <button
                      type="button"
                      disabled={isLocked || isSubmitting}
                      onClick={() => {
                        setOrderingId(item.youtubeId);
                        executeOrder(item.youtubeId);
                      }}
                      className="shrink-0 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-[#25385b] hover:bg-[#3252f4] text-[#ffffff] text-xs font-bold border border-[#25385b] flex items-center gap-1 sm:gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      title="Order bài này ngay"
                    >
                      {isItemOrdering ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ffffff]" />
                      ) : (
                        <PlusCircle className="w-3.5 h-3.5 text-[#ffffff]" />
                      )}
                      <span>Order</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fallback Submit Button when typing a link without preview */}
        {isYouTubeUrl(inputQuery) && !preview && (
          <button
            type="submit"
            disabled={isLocked || isSubmitting || !inputQuery.trim()}
            className="w-full py-3 bg-[#25385b] hover:bg-[#3252f4] text-[#ffffff] text-xs font-bold uppercase tracking-wider rounded-lg border border-[#25385b] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#ffffff]" />
                <span>Đang thêm vào hàng đợi...</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4 text-[#ffffff]" />
                <span>Thêm vào hàng đợi</span>
              </>
            )}
          </button>
        )}
      </form>
    </div>
  );
};
