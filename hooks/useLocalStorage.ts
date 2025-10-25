import { useState, useEffect, Dispatch, SetStateAction } from 'react';

function getStorageValue<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const saved = window.localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : defaultValue;
  } catch (error) {
    console.error(`Error reading localStorage key “${key}”:`, error);
    return defaultValue;
  }
}

// Fix: Import Dispatch and SetStateAction and use them in the return type.
export const useLocalStorage = <T,>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, value]);

  return [value, setValue];
};