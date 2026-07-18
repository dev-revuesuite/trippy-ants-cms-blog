"use client";

import { useState, useTransition } from "react";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { saveCategory, deleteCategory } from "./actions";
import type { Category } from "@/lib/supabase/database.types";

type CategoryWithCount = Category & { post_count: number };

export function CategoriesManager({ categories }: { categories: CategoryWithCount[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveCategory(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setEditingId(null);
        setShowNew(false);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this category? Posts will need to be re-categorized.")) return;
    startTransition(async () => {
      const res = await deleteCategory(id);
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
        <p className="text-sm text-ink-muted">{categories.length} categories</p>
        {!showNew && (
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New category
          </Button>
        )}
      </div>

      {showNew && (
        <CategoryForm
          onSubmit={handleSubmit}
          onCancel={() => setShowNew(false)}
          pending={isPending}
        />
      )}

      <div className="border border-mist rounded-lg divide-y divide-mist">
        {categories.length === 0 && !showNew && (
          <div className="py-12 text-center text-sm text-ink-muted">
            No categories yet. Create the first one to get started.
          </div>
        )}
        {categories.map((cat) =>
          editingId === cat.id ? (
            <div key={cat.id} className="p-4">
              <CategoryForm
                category={cat}
                onSubmit={handleSubmit}
                onCancel={() => setEditingId(null)}
                pending={isPending}
              />
            </div>
          ) : (
            <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-paper">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-ink">{cat.name}</span>
                  <code className="text-xs text-ink-muted font-mono">/{cat.slug}</code>
                  <span className="text-xs text-ink-muted">
                    {cat.post_count} {cat.post_count === 1 ? "post" : "posts"}
                  </span>
                </div>
                {cat.description && (
                  <p className="text-sm text-ink-muted mt-1 line-clamp-1">{cat.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingId(cat.id)}
                  disabled={isPending}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(cat.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function CategoryForm({
  category,
  onSubmit,
  onCancel,
  pending,
}: {
  category?: CategoryWithCount;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <form
      action={onSubmit}
      className="border border-brand/30 bg-brand/5 rounded-lg p-4 space-y-3"
    >
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={category?.name ?? ""}
            placeholder="e.g. Creative Operations"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug (optional)</Label>
          <Input
            id="slug"
            name="slug"
            defaultValue={category?.slug ?? ""}
            placeholder="auto-generated from name"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={category?.description ?? ""}
          placeholder="Short description shown on archive pages"
        />
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
