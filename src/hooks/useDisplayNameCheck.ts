import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

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
        const { data, error } = await supabase.rpc('is_display_name_available', {
          p_name: debouncedName,
          p_exclude_user_id: excludeUserId || null
        });
        
        if (error) throw error;
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
  const { data, error } = await supabase.rpc('is_display_name_available', {
    p_name: name.trim(),
    p_exclude_user_id: excludeUserId || null
  });
  
  if (error) throw error;
  return data as boolean;
}
