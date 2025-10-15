
'use client';

import { useState, useEffect, useCallback } from 'react';

// Define the shape of sound preferences
interface SoundPreferences {
  message: boolean;
  announcement: boolean;
  typing: boolean;
  volume: number;
}

// Default preferences
const defaultSoundPrefs: SoundPreferences = {
  message: true,
  announcement: true,
  typing: false,
  volume: 0.5,
};

// Custom hook for managing sound preferences in localStorage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}


export function useSound() {
  const [prefs, setPrefs] = useLocalStorage<SoundPreferences>('lf_sound_prefs', defaultSoundPrefs);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  const play = useCallback((type: 'message' | 'announcement' | 'typing') => {
    if (!hasInteracted || !prefs[type]) {
      return;
    }

    try {
      const audio = new Audio(`/sounds/${type}.mp3`);
      audio.volume = prefs.volume;
      audio.play().catch(error => {
        if (error.name === 'NotAllowedError') {
          console.warn('Audio playback was blocked by the browser. A user interaction is required.');
        } else {
          console.error(`Error playing sound: ${type}`, error);
        }
      });
    } catch (e) {
      console.error('Failed to play audio:', e);
    }
  }, [prefs, hasInteracted]);

  return { play, prefs, setPrefs };
}
