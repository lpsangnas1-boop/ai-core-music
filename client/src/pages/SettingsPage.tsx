import React from 'react';
import { AdminSettings } from '../components/admin/AdminSettings.js';
import { ArrowLeft } from 'lucide-react';
import type { JukeboxSettings } from '../types/index.js';

interface SettingsPageProps {
  settings: JukeboxSettings;
  onUpdateSettings: (partial: Partial<JukeboxSettings>) => Promise<any>;
  onNavigateBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onNavigateBack,
}) => {
  return (
    <div className="max-w-[958px] mx-auto px-4 sm:px-6 py-6 space-y-4 text-[#25385b]">
      <button
        onClick={onNavigateBack}
        className="btn-outline inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-[#1a2b88]" />
        <span>Quay lại DJ Station</span>
      </button>

      <AdminSettings settings={settings} onUpdateSettings={onUpdateSettings} />
    </div>
  );
};
