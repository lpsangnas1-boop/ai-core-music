import { useState, useEffect } from 'react';

const DEVICE_ID_KEY = 'office_jukebox_device_id';
const REQUESTER_NAME_KEY = 'office_jukebox_requester_name';
const USER_AVATAR_KEY = 'office_jukebox_user_avatar';
const ADMIN_PIN_KEY = 'office_jukebox_admin_pin';

export const AVATAR_OPTIONS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐯', '🤖', '👽', '🦄', '🐸', '🐨'];

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string>('');
  const [requesterName, setRequesterNameState] = useState<string>('');
  const [userAvatar, setUserAvatarState] = useState<string>('🐱');
  const [adminPin, setAdminPinState] = useState<string>('');

  useEffect(() => {
    // Device ID
    let storedDeviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!storedDeviceId) {
      storedDeviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
    }
    setDeviceId(storedDeviceId);

    // Requester Name
    const storedName = localStorage.getItem(REQUESTER_NAME_KEY);
    if (storedName) {
      setRequesterNameState(storedName);
    }

    // Requester Avatar
    const storedAvatar = localStorage.getItem(USER_AVATAR_KEY);
    if (storedAvatar) {
      setUserAvatarState(storedAvatar);
    } else {
      const randomAvatar = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
      setUserAvatarState(randomAvatar);
      localStorage.setItem(USER_AVATAR_KEY, randomAvatar);
    }

    // Admin PIN
    const storedPin = localStorage.getItem(ADMIN_PIN_KEY);
    if (storedPin) {
      setAdminPinState(storedPin);
    }
  }, []);

  const saveRequesterName = (name: string) => {
    setRequesterNameState(name);
    localStorage.setItem(REQUESTER_NAME_KEY, name);
  };

  const saveUserAvatar = (avatar: string) => {
    setUserAvatarState(avatar);
    localStorage.setItem(USER_AVATAR_KEY, avatar);
  };

  const saveAdminPin = (pin: string) => {
    setAdminPinState(pin);
    localStorage.setItem(ADMIN_PIN_KEY, pin);
  };

  const clearAdminPin = () => {
    setAdminPinState('');
    localStorage.removeItem(ADMIN_PIN_KEY);
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
