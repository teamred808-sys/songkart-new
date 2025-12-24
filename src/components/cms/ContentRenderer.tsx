import { cn } from '@/lib/utils';

interface ContentRendererProps {
  html: string | null;
  className?: string;
}

export function ContentRenderer({ html, className }: ContentRendererProps) {
  if (!html) {
    return (
      <div className={cn('text-muted-foreground', className)}>
        No content available.
      </div>
    );
  }

  return (
    <div
      className={cn(
        'prose prose-invert max-w-none',
        // Typography styles
        'prose-headings:font-display prose-headings:tracking-tight',
        'prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-6',
        'prose-h2:text-3xl prose-h2:font-semibold prose-h2:mb-4 prose-h2:mt-10',
        'prose-h3:text-2xl prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-8',
        'prose-h4:text-xl prose-h4:font-medium prose-h4:mb-2 prose-h4:mt-6',
        'prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-4',
        // Links
        'prose-a:text-primary prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-primary/80',
        // Lists
        'prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4',
        'prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4',
        'prose-li:text-foreground prose-li:mb-1',
        // Blockquotes
        'prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground',
        // Code
        'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
        'prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto',
        // Images
        'prose-img:rounded-lg prose-img:max-w-full',
        // HR
        'prose-hr:border-border prose-hr:my-8',
        // Strong/Em
        'prose-strong:font-semibold prose-strong:text-foreground',
        'prose-em:italic',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
