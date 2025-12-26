import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSecurePlayback } from '@/hooks/useSecurePlayback';
import { useAudioPlayerOptional } from '@/contexts/AudioPlayerContext';
import { toast } from 'sonner';

interface MiniAudioPlayerProps {
  songId: string;
  previewUrl?: string | null;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  className?: string;
}

export interface MiniAudioPlayerHandle {
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  isPlaying: boolean;
  isLoading: boolean;
}

export const MiniAudioPlayer = forwardRef<MiniAudioPlayerHandle, MiniAudioPlayerProps>(
  function MiniAudioPlayer({
    songId,
    previewUrl,
    onPlay,
    onPause,
    onEnded,
    className,
  }, ref) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const progressIntervalRef = useRef<number | null>(null);
    const hasStartedRef = useRef(false);
    
    const { getDirectPreviewUrl, getToken, getStreamUrl, checkAbuse } = useSecurePlayback();
    const audioContext = useAudioPlayerOptional();

    // Stop if another song starts playing
    useEffect(() => {
      if (audioContext && audioContext.currentlyPlayingId && audioContext.currentlyPlayingId !== songId) {
        handlePause();
      }
    }, [audioContext?.currentlyPlayingId, songId]);

    const startProgressTracking = useCallback(() => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      progressIntervalRef.current = window.setInterval(() => {
        if (audioRef.current) {
          const current = audioRef.current.currentTime;
          const total = audioRef.current.duration || 0;
          setCurrentTime(current);
          setDuration(total);
          setProgress(total > 0 ? (current / total) * 100 : 0);
        }
      }, 100);
    }, []);

    const stopProgressTracking = useCallback(() => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }, []);

    const setupAudioElement = useCallback(() => {
      if (audioRef.current) return audioRef.current;
      
      const audio = new Audio();
      audio.preload = 'metadata'; // Only load metadata initially
      audio.crossOrigin = 'anonymous';
      
      // Disable download/context menu
      audio.addEventListener('contextmenu', (e) => e.preventDefault());
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
        setCurrentTime(0);
        stopProgressTracking();
        audioContext?.stop();
        hasStartedRef.current = false;
        onEnded?.();
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio element error:', e);
        setIsPlaying(false);
        setIsLoading(false);
        setHasError(true);
        stopProgressTracking();
        audioContext?.stop();
        hasStartedRef.current = false;
        toast.error('Preview unavailable', {
          description: 'This song preview could not be loaded'
        });
      });

      // Start playback as soon as we have enough data
      audio.addEventListener('canplay', () => {
        if (hasStartedRef.current && audio.paused) {
          audio.play().catch(console.error);
        }
      });

      audioRef.current = audio;
      return audio;
    }, [stopProgressTracking, audioContext, onEnded]);

    const handlePlay = useCallback(async () => {
      if (isLoading) return;

      // Guard: Don't attempt playback if no preview URL is available
      if (!previewUrl) {
        toast.error('Preview not available', {
          description: 'This song preview is still being processed. Please try again later.'
        });
        setHasError(true);
        return;
      }

      try {
        setIsLoading(true);
        setHasError(false);
        hasStartedRef.current = true;

        const audio = setupAudioElement();

        // Try direct public URL first for instant playback
        const directUrl = getDirectPreviewUrl(previewUrl || null);
        
        if (directUrl) {
          // Use direct CDN URL for fastest loading
          audio.src = directUrl;
          
          // Start playback immediately
          try {
            await audio.play();
            setIsPlaying(true);
            setIsLoading(false);
            startProgressTracking();
            audioContext?.play(songId);
            onPlay?.();
            
            // Log play asynchronously in background (don't block playback)
            checkAbuse().catch(() => {}); // Just for tracking
            return;
          } catch (playError) {
            console.warn('Direct playback failed, falling back to token:', playError);
          }
        }

        // Fallback: Use token-based streaming if direct URL fails or doesn't exist
        const tokenData = await getToken(songId, 'preview');
        if (!tokenData || !tokenData.token) {
          throw new Error('Failed to get playback token');
        }

        const streamUrl = getStreamUrl(songId, tokenData.token);
        audio.src = streamUrl;
        
        await audio.play();
        
        setIsPlaying(true);
        setIsLoading(false);
        startProgressTracking();
        audioContext?.play(songId);
        onPlay?.();
      } catch (error) {
        console.error('Playback error:', error);
        setIsLoading(false);
        setIsPlaying(false);
        setHasError(true);
        hasStartedRef.current = false;
        toast.error('Unable to play preview', {
          description: error instanceof Error ? error.message : 'Please try again'
        });
      }
    }, [isLoading, songId, previewUrl, setupAudioElement, getDirectPreviewUrl, getToken, getStreamUrl, checkAbuse, stopProgressTracking, audioContext, startProgressTracking, onPlay]);

    const handlePause = useCallback(() => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      stopProgressTracking();
      onPause?.();
    }, [stopProgressTracking, onPause]);

    const handleStop = useCallback(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      hasStartedRef.current = false;
      stopProgressTracking();
    }, [stopProgressTracking]);

    // Expose imperative handle for parent components
    useImperativeHandle(ref, () => ({
      play: handlePlay,
      pause: handlePause,
      stop: handleStop,
      isPlaying,
      isLoading,
    }), [handlePlay, handlePause, handleStop, isPlaying, isLoading]);

    const togglePlayback = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isPlaying) {
        handlePause();
      } else {
        handlePlay();
      }
    };

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        stopProgressTracking();
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
          audioRef.current = null;
        }
      };
    }, [stopProgressTracking]);

    const formatTime = (seconds: number) => {
      if (!seconds || isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div 
        className={cn(
          "flex items-center gap-2",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "h-10 w-10 rounded-full transition-all",
            isPlaying 
              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
              : "bg-background/80 hover:bg-background"
          )}
          onClick={togglePlayback}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : hasError ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        {/* Progress bar - only show when playing */}
        {(isPlaying || currentTime > 0) && (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="relative h-1 flex-1 bg-muted rounded-full overflow-hidden min-w-[60px]">
              <div 
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
              {formatTime(currentTime)}
            </span>
          </div>
        )}
      </div>
    );
  }
);