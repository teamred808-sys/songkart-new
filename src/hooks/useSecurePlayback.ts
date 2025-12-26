import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SecurePlaybackState {
  token: string | null;
  expiresAt: Date | null;
  isLoading: boolean;
  error: string | null;
  maxDuration: number | null;
}

interface AbuseCheckResult {
  blocked: boolean;
  requiresCaptcha: boolean;
  warnings: string[];
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export function useSecurePlayback() {
  const { user } = useAuth();
  const [state, setState] = useState<SecurePlaybackState>({
    token: null,
    expiresAt: null,
    isLoading: false,
    error: null,
    maxDuration: null
  });
  
  const deviceFingerprint = useRef<string>(generateDeviceFingerprint());
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate a simple device fingerprint
  function generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fingerprint', 2, 2);
    }
    
    const data = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  const checkAbuse = useCallback(async (): Promise<AbuseCheckResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('check-abuse', {
        body: {
          userId: user?.id,
          deviceFingerprint: deviceFingerprint.current,
          action: 'check'
        }
      });

      if (error) throw error;
      return data as AbuseCheckResult;
    } catch (err) {
      console.error('Abuse check failed:', err);
      return { blocked: false, requiresCaptcha: false, warnings: [], severity: 'none' };
    }
  }, [user?.id]);

  const reportAbuse = useCallback(async (flagType: string, details?: Record<string, unknown>) => {
    try {
      await supabase.functions.invoke('check-abuse', {
        body: {
          userId: user?.id,
          deviceFingerprint: deviceFingerprint.current,
          action: 'report',
          flagType,
          details
        }
      });
    } catch (err) {
      console.error('Failed to report abuse:', err);
    }
  }, [user?.id]);

  // Get direct public URL for preview (bypasses edge function for speed)
  const getDirectPreviewUrl = useCallback((previewAudioUrl: string | null): string | null => {
    if (!previewAudioUrl) return null;
    
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // If it's already a full URL, return it
    if (previewAudioUrl.startsWith('http')) {
      return previewAudioUrl;
    }
    
    // Extract path and build public URL from song-previews bucket
    const path = previewAudioUrl.includes('song-previews/') 
      ? previewAudioUrl.split('song-previews/')[1]
      : previewAudioUrl;
    
    return `${baseUrl}/storage/v1/object/public/song-previews/${path}`;
  }, []);

  const getToken = useCallback(async (songId: string, type: 'preview' | 'purchased' = 'preview') => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check for abuse first
      const abuseCheck = await checkAbuse();
      if (abuseCheck.blocked) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Access temporarily blocked due to suspicious activity'
        }));
        return null;
      }
      
      const { data, error } = await supabase.functions.invoke('audio-token', {
        body: {
          songId,
          type,
          deviceFingerprint: deviceFingerprint.current
        }
      });

      if (error) throw error;

      const expiresAt = new Date(data.expiresAt);
      
      setState({
        token: data.token,
        expiresAt,
        isLoading: false,
        error: null,
        maxDuration: data.maxDuration
      });

      // Set up token refresh before expiry
      const refreshTime = expiresAt.getTime() - Date.now() - 60000; // 1 min before expiry
      if (refreshTime > 0) {
        refreshTimeoutRef.current = setTimeout(() => {
          getToken(songId, type);
        }, refreshTime);
      }

      return data;
    } catch (err: unknown) {
      console.error('Failed to get audio token:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get playback token';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return null;
    }
  }, [checkAbuse]);

  const getStreamUrl = useCallback((songId: string, token: string): string => {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${baseUrl}/functions/v1/stream-preview?songId=${songId}&token=${encodeURIComponent(token)}`;
  }, []);

  const invalidateToken = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    setState({
      token: null,
      expiresAt: null,
      isLoading: false,
      error: null,
      maxDuration: null
    });
  }, []);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    getToken,
    getStreamUrl,
    getDirectPreviewUrl,
    invalidateToken,
    checkAbuse,
    reportAbuse,
    deviceFingerprint: deviceFingerprint.current
  };
}