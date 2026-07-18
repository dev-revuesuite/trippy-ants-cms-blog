"use client";

import { useState, useTransition } from "react";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { saveTag, deleteTag } from "./actions";
import type { Tag } from "@/lib/supabase/database.types";

type TagWithCount = Tag & { post_count: number };

export function TagsManager({ tags }: { tags: TagWithCount[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveTag(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setEditingId(null);
        setShowNew(false);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this tag? It will be removed from all posts.")) return;
    startTransition(async () => {
      const res = await deleteTag(id);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">{tags.length} tags</p>
        {!showNew && (
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New tag
          </Button>
        )}
      </div>

      {showNew && (
        <TagForm
          onSubmit={handleSubmit}
          onCancel={() => setShowNew(false)}
          pending={isPending}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {tags.length === 0 && !showNew && (
          <div className="col-span-2 py-12 text-center text-sm text-ink-muted border border-dashed border-mist rounded-lg">
            No tags yet.
          </div>
        )}
        {tags.map((tag) =>
          editingId === tag.id ? (
            <div key={tag.id} className="col-span-2">
              <TagForm
                tag={tag}
                onSubmit={handleSubmit}
                onCancel={() => setEditingId(null)}
                pending={isPending}
              />
            </div>
          ) : (
            <div
              key={tag.id}
              className="flex items-center justify-between border border-mist rounded-md px-3 py-2 hover:border-brand/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink text-sm">#{tag.name}</span>
                  <span className="text-xs text-ink-muted">
                    {tag.post_count}
                  </span>
                </div>
                <code className="text-xs text-ink-muted font-mono">/{tag.slug}</code>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingId(tag.id)}
                  disabled={isPending}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(tag.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function TagForm({
  tag,
  onSubmit,
  onCancel,
  pending,
}: {
  tag?: TagWithCount;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <form
      action={onSubmit}
      className="border border-brand/30 bg-brand/5 rounded-lg p-3 space-y-3"
    >
      {tag && <input type="hidden" name="id" value={tag.id} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={tag?.name ?? ""}
            placeholder="e.g. brand strategy"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug (optional)</Label>
          <Input
            id="slug"
            name="slug"
            defaultValue={tag?.slug ?? ""}
            placeholder="auto-generated"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          <Check className="h-4 w-4 mr-1.5" />
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          <X className="h-4 w-4 mr-1.5" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
