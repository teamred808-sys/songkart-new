import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AudioPlayerContextValue {
  currentlyPlayingId: string | null;
  play: (songId: string) => void;
  stop: () => void;
  isPlaying: (songId: string) => boolean;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | undefined>(undefined);

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  const play = useCallback((songId: string) => {
    setCurrentlyPlayingId(songId);
  }, []);

  const stop = useCallback(() => {
    setCurrentlyPlayingId(null);
  }, []);

  const isPlaying = useCallback((songId: string) => {
    return currentlyPlayingId === songId;
  }, [currentlyPlayingId]);

  return (
    <AudioPlayerContext.Provider value={{ currentlyPlayingId, play, stop, isPlaying }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
}

export function useAudioPlayerOptional() {
  return useContext(AudioPlayerContext);
}
