import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface SidebarNavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: number | null;
}

export interface SidebarNavSection {
  title: string;
  items: SidebarNavItem[];
}

interface MobileSidebarContentProps {
  sections: SidebarNavSection[];
  activeColor?: string;
}

export function MobileSidebarContent({ sections, activeColor = 'text-primary' }: MobileSidebarContentProps) {
  const location = useLocation();

  return (
    <div className="p-2 space-y-4">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {section.title}
          </h3>
          <ul className="space-y-1">
            {section.items.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors min-h-[48px]",
                      isActive 
                        ? `bg-primary/10 ${activeColor} font-medium` 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                        {item.badge > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
