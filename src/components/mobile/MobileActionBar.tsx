import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileActionBarProps {
  children: ReactNode;
  className?: string;
}

export function MobileActionBar({ children, className }: MobileActionBarProps) {
  return (
    <div 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom md:hidden",
        className
      )}
    >
      {children}
    </div>
  );
}
