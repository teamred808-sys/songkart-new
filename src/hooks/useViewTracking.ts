import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const VIEW_THRESHOLD_SECONDS = 5;

/**
 * Hook for tracking authentic song views.
 * 
 * Rules enforced:
 * 1. User must be authenticated
 * 2. User cannot be the seller of the song
 * 3. User cannot be an admin
 * 4. Minimum 5 seconds of playback required
 * 5. Only 1 view per user per song per 24 hours
 * 
 * All validation is done server-side for security.
 */
export function useViewTracking(songId: string | undefined, sellerId?: string) {
  const { user, isAdmin } = useAuth();
  const viewRecordedRef = useRef(false);
  const playbackStartRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());
  
  /**
   * Start tracking playback time.
   * Call this when audio playback starts.
   */
  const startTracking = useCallback(() => {
    // Quick client-side checks to avoid unnecessary tracking
    // (Server validates all rules anyway)
    if (!user || isAdmin || user.id === sellerId || viewRecordedRef.current || !songId) {
      return;
    }
    
    playbackStartRef.current = Date.now();
  }, [user, isAdmin, sellerId, songId]);
  
  /**
   * Check if playback threshold is met and record view if so.
   * Call this when audio pauses, ends, or periodically during playback.
   */
  const checkAndRecordView = useCallback(async () => {
    if (!user || !playbackStartRef.current || viewRecordedRef.current || !songId) {
      return { recorded: false, reason: 'precondition_failed' };
    }
    
    const playbackSeconds = (Date.now() - playbackStartRef.current) / 1000;
    
    // Client-side threshold check (server will validate too)
    if (playbackSeconds < VIEW_THRESHOLD_SECONDS) {
      return { recorded: false, reason: 'insufficient_playback', seconds: playbackSeconds };
    }
    
    try {
      // Mark as recorded to prevent duplicate calls
      viewRecordedRef.current = true;
      
      const { data, error } = await supabase.functions.invoke('record-view', {
        body: {
          songId,
          playbackSeconds,
          deviceFingerprint: generateDeviceFingerprint()
        }
      });
      
      if (error) {
        console.error('Failed to record view:', error);
        viewRecordedRef.current = false; // Allow retry on error
        return { recorded: false, reason: 'api_error', error };
      }
      
      // Check server response
      if (data?.success) {
        return { recorded: true, reason: 'view_recorded' };
      } else {
        // Server rejected the view (duplicate, seller, admin, etc.)
        // Keep viewRecordedRef true to prevent retries for valid rejections
        const shouldAllowRetry = data?.reason === 'database_error' || data?.reason === 'internal_error';
        if (shouldAllowRetry) {
          viewRecordedRef.current = false;
        }
        return { recorded: false, reason: data?.reason || 'unknown' };
      }
    } catch (err) {
      console.error('View tracking error:', err);
      viewRecordedRef.current = false; // Allow retry on error
      return { recorded: false, reason: 'exception', error: err };
    }
  }, [user, songId]);
  
  /**
   * Reset tracking state for a new playback session.
   * Call this when navigating to a different song.
   */
  const resetTracking = useCallback(() => {
    viewRecordedRef.current = false;
    playbackStartRef.current = null;
    sessionIdRef.current = generateSessionId();
  }, []);
  
  /**
   * Get current playback duration in seconds.
   */
  const getPlaybackDuration = useCallback(() => {
    if (!playbackStartRef.current) return 0;
    return (Date.now() - playbackStartRef.current) / 1000;
  }, []);
  
  return { 
    startTracking, 
    checkAndRecordView, 
    resetTracking,
    getPlaybackDuration,
    isViewRecorded: viewRecordedRef.current,
    canTrack: !!user && !isAdmin && user.id !== sellerId
  };
}

/**
 * Generate a simple device fingerprint for duplicate detection.
 * This is NOT meant for tracking users, only for preventing abuse.
 */
function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || 'unknown'
  ];
  
  // Simple hash-like encoding
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Generate a unique session ID for this playback session.
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
