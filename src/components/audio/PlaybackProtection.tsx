import { Shield, Lock } from "lucide-react";

interface PlaybackProtectionProps {
  isActive?: boolean;
  className?: string;
}

export function PlaybackProtection({ isActive = false, className }: PlaybackProtectionProps) {
  if (!isActive) return null;

  return (
    <div className={`fixed inset-0 pointer-events-none z-50 ${className}`}>
      {/* Invisible overlay to prevent screen capture metadata */}
      <div className="absolute inset-0 bg-transparent" />
      
      {/* Protection indicator */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-muted-foreground">
        <Shield className="h-3 w-3 text-primary" />
        <span>Audio Protected</span>
        <Lock className="h-3 w-3" />
      </div>
    </div>
  );
}
