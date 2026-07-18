'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import Youtube from '@tiptap/extension-youtube';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Code, Link as LinkIcon,
  Image as ImageIcon, Table as TableIcon, Minus, Undo, Redo, Youtube as YoutubeIcon, Loader2,
} from 'lucide-react';
import { uploadMediaFile } from '@/app/cms/media/actions';
import { validateImageFile } from '@/lib/upload-limits';

const lowlight = createLowlight(common);

interface Props {
  initialContent?: any;
  onChange: (json: any, html: string) => void;
}

export function TiptapEditor({ initialContent, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({ placeholder: 'Tell the story…' }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener', target: '_blank' } }),
      ImageExt.configure({ HTMLAttributes: { class: 'rounded-md' } }),
      Typography,
      Youtube.configure({ controls: true, modestBranding: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => onChange(editor.getJSON(), editor.getHTML()),
  });

  // Drag-drop image upload
  useEffect(() => {
    if (!editor) return;
    const el = editor.view.dom;
    const onDrop = async (e: DragEvent) => {
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      const validationError = validateImageFile(file);
      if (validationError) {
        e.preventDefault();
        setUploadError(validationError);
        return;
      }
      e.preventDefault();
      setUploading(true);
      setUploadError(null);
      try {
        const url = await uploadImageRaw(file);
        if (!url) {
          setUploadError('Upload failed. Try a smaller image (under 4 MB) or check your connection.');
          return;
        }
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } finally {
        setUploading(false);
      }
    };
    el.addEventListener('drop', onDrop);
    return () => el.removeEventListener('drop', onDrop);
  }, [editor]);

  if (!editor) return <div className="min-h-[60vh] animate-pulse rounded-md bg-mist/40" />;

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setUploadError(validationError);
      e.target.value = '';
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImageRaw(file);
      if (!url) {
        setUploadError('Upload failed. Try a smaller image (under 4 MB) or check your connection.');
        return;
      }
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <Toolbar
        editor={editor}
        onImageClick={() => fileRef.current?.click()}
        uploading={uploading}
      />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
      {uploading && <p className="mb-3 text-xs text-muted-foreground">Uploading image…</p>}
      {uploadError && (
        <p className="mb-3 text-xs text-red-600">
          {uploadError}{' '}
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="underline hover:text-red-800"
          >
            Dismiss
          </button>
        </p>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({
  editor,
  onImageClick,
  uploading,
}: {
  editor: Editor;
  onImageClick: () => void;
  uploading: boolean;
}) {
  const Btn = ({ active, onClick, label, children }: any) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-md p-2 text-muted-foreground hover:bg-mist hover:text-ink ${active ? 'bg-mist text-ink' : ''}`}
    >
      {children}
    </button>
  );

  return (
    <div className="sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-1 border-b border-border bg-paper/95 py-2 backdrop-blur">
      <Btn label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </Btn>
      <Btn label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </Btn>

      <div className="mx-1 h-5 w-px bg-border" />

      <Btn label="Heading 2" active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </Btn>
      <Btn label="Heading 3" active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-4 w-4" />
      </Btn>

      <div className="mx-1 h-5 w-px bg-border" />

      <Btn label="Bulleted list" active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </Btn>
      <Btn label="Numbered list" active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </Btn>
      <Btn label="Quote" active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </Btn>
      <Btn label="Code block" active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code className="h-4 w-4" />
      </Btn>
      <Btn label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </Btn>

      <div className="mx-1 h-5 w-px bg-border" />

      <Btn
        label="Link"
        active={editor.isActive('link')}
        onClick={() => {
          const url = prompt('URL') || '';
          if (!url) return editor.chain().focus().unsetLink().run();
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }}
      >
        <LinkIcon className="h-4 w-4" />
      </Btn>
      <Btn
        label={uploading ? 'Uploading image…' : 'Image'}
        onClick={uploading ? () => {} : onImageClick}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </Btn>
      <Btn
        label="YouTube"
        onClick={() => {
          const url = prompt('YouTube URL');
          if (url) editor.commands.setYoutubeVideo({ src: url });
        }}
      >
        <YoutubeIcon className="h-4 w-4" />
      </Btn>
      <Btn
        label="Table"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <TableIcon className="h-4 w-4" />
      </Btn>

      <div className="mx-1 h-5 w-px bg-border" />

      <Btn label="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <Undo className="h-4 w-4" />
      </Btn>
      <Btn label="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <Redo className="h-4 w-4" />
      </Btn>
    </div>
  );
}

// ---------- Image upload (server action — uses CMS session cookies) ----------
/** Returns null on error; caller is expected to surface the error via UI. */
async function uploadImageRaw(file: File): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.set('file', file);
    const res = await uploadMediaFile(fd);
    if (res.error) return null;
    return res.row?.url ?? null;
  } catch {
    return null;
  }
}
