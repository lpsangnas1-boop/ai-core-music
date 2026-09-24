import { useState } from 'react';

const DEVICE_ID_KEY = 'office_jukebox_device_id';
const REQUESTER_NAME_KEY = 'office_jukebox_requester_name';
const USER_AVATAR_KEY = 'office_jukebox_user_avatar';
export const ADMIN_PIN_KEY = 'office_jukebox_admin_pin';

export const AVATAR_OPTIONS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐯', '🤖', '👽', '🦄', '🐸', '🐨'];

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode) - keep in memory only
  }
}

function initDeviceId(): string {
  let id = readStorage(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    writeStorage(DEVICE_ID_KEY, id);
  }
  return id;
}

function initAvatar(): string {
  const stored = readStorage(USER_AVATAR_KEY);
  if (stored) return stored;
  const randomAvatar = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
  writeStorage(USER_AVATAR_KEY, randomAvatar);
  return randomAvatar;
}

// Values are read synchronously on first render so admin routes know immediately
// whether a PIN is stored.
export function useDeviceId() {
  const [deviceId] = useState<string>(initDeviceId);
  const [requesterName, setRequesterNameState] = useState<string>(() => readStorage(REQUESTER_NAME_KEY) || '');
  const [userAvatar, setUserAvatarState] = useState<string>(initAvatar);
  const [adminPin, setAdminPinState] = useState<string>(() => readStorage(ADMIN_PIN_KEY) || '');

  const saveRequesterName = (name: string) => {
    setRequesterNameState(name);
    writeStorage(REQUESTER_NAME_KEY, name);
  };

  const saveUserAvatar = (avatar: string) => {
    setUserAvatarState(avatar);
    writeStorage(USER_AVATAR_KEY, avatar);
  };

  const saveAdminPin = (pin: string) => {
    setAdminPinState(pin);
    writeStorage(ADMIN_PIN_KEY, pin);
  };

  const clearAdminPin = () => {
    setAdminPinState('');
    writeStorage(ADMIN_PIN_KEY, null);
  };

  return {
    deviceId,
    requesterName,
    saveRequesterName,
    userAvatar,
    saveUserAvatar,
    adminPin,
    saveAdminPin,
    clearAdminPin,
  };
}
