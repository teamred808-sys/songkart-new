import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { apiFetch } from '@/lib/api';

export function useDisplayNameAvailability(name: string, excludeUserId?: string) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const debouncedName = useDebounce(name.trim(), 400);

  useEffect(() => {
    if (!debouncedName || debouncedName.length < 2) {
      setIsAvailable(null);
      setIsChecking(false);
      return;
    }

    const checkAvailability = async () => {
      setIsChecking(true);
      try {
        const data = await apiFetch('/auth/check-name', {
          method: 'POST',
          body: JSON.stringify({ name: debouncedName, exclude_user_id: excludeUserId })
        });
        setIsAvailable(data as boolean);
      } catch (error) {
        console.error('Error checking display name:', error);
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    };

    checkAvailability();
  }, [debouncedName, excludeUserId]);

  return { isAvailable, isChecking };
}

export async function checkDisplayNameAvailable(name: string, excludeUserId?: string): Promise<boolean> {
  try {
    const data = await apiFetch('/auth/check-name', {
      method: 'POST',
      body: JSON.stringify({ name, exclude_user_id: excludeUserId })
    });
    return data as boolean;
  } catch (e) {
    console.error('Error checking display name:', e);
    return true;
  }
}
