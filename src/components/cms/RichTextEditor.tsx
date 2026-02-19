import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageResize from 'tiptap-extension-resize-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect, useCallback, useState } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { cn } from '@/lib/utils';
import { useUploadMedia } from '@/hooks/useCmsMedia';
import { Loader2 } from 'lucide-react';

interface RichTextEditorProps {
  content?: Record<string, unknown>;
  onChange?: (json: Record<string, unknown>, html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className,
  editable = true,
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const uploadMedia = useUploadMedia();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      ImageResize.configure({
        inline: false,
        minWidth: 100,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-4 hover:text-primary/80',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        HTMLAttributes: {
          class: 'rounded-lg overflow-hidden',
        },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: content || { type: 'doc', content: [] },
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getJSON(), editor.getHTML());
      }
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const addImage = useCallback((url: string, alt?: string) => {
    if (editor) {
      // @ts-ignore - setImage provided by tiptap-extension-resize-image
      editor.chain().focus().setImage({ src: url, alt: alt || '' }).run();
    }
  }, [editor]);

  const addYoutubeVideo = useCallback((url: string) => {
    if (editor) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback((url: string) => {
    if (editor) {
      if (url) {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      } else {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      }
    }
  }, [editor]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editable) setIsDragging(true);
  }, [editable]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!editable || !editor) return;

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    for (const file of files) {
      try {
        const result = await uploadMedia.mutateAsync({ file, altText: file.name });
        // @ts-ignore - setImage is provided by tiptap-extension-resize-image
        editor.chain().focus().setImage({ src: result.public_url, alt: result.alt_text || '' }).run();
      } catch {
        // error toast is handled by the hook
      }
    }
  }, [editable, editor, uploadMedia]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card relative',
        isDragging && 'ring-2 ring-primary border-primary',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {editable && (
        <EditorToolbar
          editor={editor}
          onAddImage={addImage}
          onAddYoutube={addYoutubeVideo}
          onSetLink={setLink}
        />
      )}
      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-invert max-w-none p-4 min-h-[300px] focus:outline-none',
          '[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
          isFocused && 'ring-1 ring-ring ring-offset-1 ring-offset-background rounded-b-lg'
        )}
      />
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center pointer-events-none z-10">
          <p className="text-primary font-medium text-lg">Drop image here</p>
        </div>
      )}
      {uploadMedia.isPending && (
        <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center z-20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Uploading image...</span>
          </div>
        </div>
      )}
    </div>
  );
}
