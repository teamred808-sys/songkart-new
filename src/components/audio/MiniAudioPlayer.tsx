import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Loader2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSecurePlayback } from '@/hooks/useSecurePlayback';
import { useAudioPlayerOptional } from '@/contexts/AudioPlayerContext';

interface MiniAudioPlayerProps {
  songId: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  className?: string;
}

export function MiniAudioPlayer({
  songId,
  onPlay,
  onPause,
  onEnded,
  className,
}: MiniAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  
  const { getToken, getStreamUrl } = useSecurePlayback();
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

  const handlePlay = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      // Get secure token
      const token = await getToken(songId, 'preview');
      if (!token) {
        throw new Error('Failed to get playback token');
      }

      // Create audio element if needed
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.preload = 'none';
        
        // Disable download/context menu
        audioRef.current.addEventListener('contextmenu', (e) => e.preventDefault());
        
        audioRef.current.addEventListener('ended', () => {
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
          stopProgressTracking();
          audioContext?.stop();
          onEnded?.();
        });

        audioRef.current.addEventListener('error', () => {
          setIsPlaying(false);
          setIsLoading(false);
          stopProgressTracking();
          audioContext?.stop();
        });
      }

      // Set stream URL and play
      const streamUrl = getStreamUrl(songId, token);
      audioRef.current.src = streamUrl;
      await audioRef.current.play();
      
      setIsPlaying(true);
      setIsLoading(false);
      startProgressTracking();
      audioContext?.play(songId);
      onPlay?.();
    } catch (error) {
      console.error('Playback error:', error);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    stopProgressTracking();
    onPause?.();
  };

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
