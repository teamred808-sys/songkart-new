import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useSecurePlayback } from "@/hooks/useSecurePlayback";
import { toast } from "sonner";

interface SecureAudioPlayerProps {
  songId: string;
  duration?: number;
  className?: string;
  onPlay?: () => void;
  showProtectionBadge?: boolean;
}

export function SecureAudioPlayer({ 
  songId, 
  duration, 
  className, 
  onPlay,
  showProtectionBadge = true 
}: SecureAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  const { 
    token, 
    isLoading, 
    error, 
    maxDuration,
    getToken, 
    getStreamUrl,
    invalidateToken,
    reportAbuse 
  } = useSecurePlayback();

  // Anti-piracy: Disable context menu
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      reportAbuse('context_menu_attempt', { songId });
    };

    container.addEventListener('contextmenu', handleContextMenu);
    return () => container.removeEventListener('contextmenu', handleContextMenu);
  }, [reportAbuse, songId]);

  // Anti-piracy: Block keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+S, Ctrl+Shift+I, F12
      if (
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        reportAbuse('keyboard_shortcut_attempt', { key: e.key, songId });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reportAbuse, songId]);

  // Anti-piracy: Detect focus changes (potential screen recording)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        // Optionally pause on tab switch - currently just logging
        console.log('Tab switched while playing');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying]);

  // Handle audio time updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      
      // Enforce max duration for previews
      if (maxDuration && audio.currentTime >= maxDuration) {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
        toast.info("Preview ended", { description: "Purchase the full song to listen without limits" });
      }
    };
    
    const updateDuration = () => {
      const effectiveDuration = maxDuration 
        ? Math.min(audio.duration, maxDuration) 
        : audio.duration;
      setAudioDuration(effectiveDuration);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    const handleCanPlay = () => setIsLoaded(true);
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setIsPlaying(false);
      toast.error("Playback error", { description: "Failed to load audio preview" });
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [maxDuration]);

  const loadSecureAudio = useCallback(async () => {
    const tokenData = await getToken(songId, 'preview');
    if (tokenData?.token) {
      const streamUrl = getStreamUrl(songId, tokenData.token);
      setAudioSrc(streamUrl);
      return true;
    }
    return false;
  }, [songId, getToken, getStreamUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Load secure audio if not loaded
      if (!audioSrc || !token) {
        const loaded = await loadSecureAudio();
        if (!loaded) return;
      }
      
      try {
        await audio.play();
        setIsPlaying(true);
        onPlay?.();
      } catch (err) {
        console.error('Play error:', err);
        // Try reloading token
        await loadSecureAudio();
      }
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const seekTime = value[0];
    // Prevent seeking beyond max duration
    if (maxDuration && seekTime > maxDuration) return;
    
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newVolume = value[0];
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = volume || 0.7;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const effectiveDuration = maxDuration ? Math.min(audioDuration, maxDuration) : audioDuration;
  const progress = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg bg-card/50 backdrop-blur relative",
        "select-none", // Prevent text selection
        className
      )}
      onDragStart={(e) => e.preventDefault()} // Prevent drag
    >
      {/* Hidden audio element - source is blob URL, not direct */}
      <audio 
        ref={audioRef} 
        src={audioSrc || undefined}
        preload="none"
        crossOrigin="anonymous"
        style={{ display: 'none' }}
      />
      
      {/* Protection badge */}
      {showProtectionBadge && (
        <div className="absolute -top-2 -right-2 bg-primary/90 text-primary-foreground text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
          <Shield className="h-3 w-3" />
          <span>Protected</span>
        </div>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        disabled={isLoading}
        className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
      >
        {isLoading ? (
          <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </Button>

      <div className="flex-1 space-y-1">
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          <Slider
            value={[currentTime]}
            max={effectiveDuration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="absolute inset-0 opacity-0 cursor-pointer"
            disabled={!isLoaded}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-1">
            {maxDuration && (
              <Lock className="h-3 w-3 text-primary" />
            )}
            <span>{formatTime(effectiveDuration)}</span>
            {maxDuration && (
              <span className="text-primary">(preview)</span>
            )}
          </div>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8">
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.01}
          onValueChange={handleVolumeChange}
          className="w-20"
        />
      </div>

      {error && (
        <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
