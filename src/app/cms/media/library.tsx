"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import { Upload, X, Trash2, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { uploadMediaFile, updateMediaAlt, deleteMedia } from "./actions";
import { validateImageFile } from "@/lib/upload-limits";
import type { Media } from "@/lib/supabase/database.types";

export function MediaLibrary({ initialMedia }: { initialMedia: Media[] }) {
  const [media, setMedia] = useState<Media[]>(initialMedia);
  const [selected, setSelected] = useState<Media | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!uploadError) return;
    const t = setTimeout(() => setUploadError(null), 8000);
    return () => clearTimeout(t);
  }, [uploadError]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    const newOnes: Media[] = [];
    const errors: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const validationError = validateImageFile(file);
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
          continue;
        }

        const fd = new FormData();
        fd.set("file", file);
        try {
          const res = await uploadMediaFile(fd);
          if (res.row) {
            newOnes.push(res.row);
          } else if (res.error) {
            errors.push(`${file.name}: ${res.error}`);
          }
        } catch {
          errors.push(`${file.name}: Upload failed — check connection and try again.`);
        }
      }
    } finally {
      if (errors.length) {
        setUploadError(errors.join(" · "));
      }
      if (newOnes.length) {
        setMedia((prev) => [...newOnes, ...prev]);
      }
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function handleAltSave(id: string, alt: string) {
    startTransition(async () => {
      const res = await updateMediaAlt(id, alt);
      if (!res.error) {
        setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, alt_text: alt } : m)));
        if (selected?.id === id) setSelected({ ...selected, alt_text: alt });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this asset permanently? Posts using it will break.")) return;
    startTransition(async () => {
      const res = await deleteMedia(id);
      if (!res.error) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
        if (selected?.id === id) setSelected(null);
      }
    });
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div>
        {uploadError && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              aria-label="Dismiss"
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-ink-muted">{media.length} assets</p>
          <div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => handleUpload(e.target.files)}
            />
            <Button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1.5" />
              )}
              {uploading ? "Uploading…" : "Upload images"}
            </Button>
          </div>
        </div>

        {media.length === 0 ? (
          <div
            className="border border-dashed border-mist rounded-lg py-20 text-center cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-colors"
            onClick={() => fileInput.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-ink-muted mb-2" />
            <p className="text-sm font-medium text-ink">Drop files or click to upload</p>
            <p className="text-xs text-ink-muted mt-1">PNG, JPG, WebP, GIF up to 10MB</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {media.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className={`group aspect-square overflow-hidden rounded-md border bg-paper relative ${
                  selected?.id === m.id ? "border-brand ring-2 ring-brand/20" : "border-mist hover:border-brand/40"
                }`}
              >
                {m.mime_type?.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.url}
                    alt={m.alt_text ?? ""}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-ink-muted">
                    {m.mime_type ?? "file"}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        {selected ? (
          <div className="border border-mist rounded-lg overflow-hidden">
            <div className="aspect-video relative bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selected.url}
                alt={selected.alt_text ?? ""}
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setSelected(null)}
                className="absolute top-2 right-2 bg-ink/80 text-paper rounded-full p-1 hover:bg-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="alt-text" className="text-xs">Alt text</Label>
                <Input
                  id="alt-text"
                  defaultValue={selected.alt_text ?? ""}
                  placeholder="Describe this image for screen readers"
                  onBlur={(e) => handleAltSave(selected.id, e.target.value)}
                />
                <p className="text-xs text-ink-muted">Saved on blur.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL</Label>
                <div className="flex gap-1.5">
                  <Input value={selected.url} readOnly className="text-xs font-mono" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyUrl(selected.url)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {selected.size_bytes ? (
                <p className="text-xs text-ink-muted">
                  {(selected.size_bytes / 1024).toFixed(1)} KB · {selected.mime_type}
                </p>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => handleDelete(selected.id)}
                disabled={isPending}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete asset
              </Button>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-mist rounded-lg p-6 text-center text-sm text-ink-muted">
            Select an asset to view details and edit alt text.
          </div>
        )}
      </aside>
    </div>
  );
}
