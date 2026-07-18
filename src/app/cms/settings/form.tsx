"use client";

import { useState, useTransition } from "react";
import { Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { saveSettings } from "./actions";

type Settings = {
  id?: string;
  site_title?: string | null;
  site_description?: string | null;
  default_og_image?: string | null;
  twitter_handle?: string | null;
  linkedin_url?: string | null;
  default_meta_title?: string | null;
  default_meta_description?: string | null;
};

export function SettingsForm({
  settings,
  disabled,
}: {
  settings: Settings | null;
  disabled?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function action(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveSettings(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <form action={action} className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="site_title">Site title</Label>
        <Input
          id="site_title"
          name="site_title"
          defaultValue={settings?.site_title ?? "Trippy Ants Journal"}
          disabled={disabled}
          placeholder="Trippy Ants Journal"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="site_description">Site description</Label>
        <Textarea
          id="site_description"
          name="site_description"
          rows={2}
          defaultValue={settings?.site_description ?? ""}
          disabled={disabled}
          placeholder="Field notes on creative operations, brand strategy, and the agency craft."
        />
      </div>

      <div className="border-t border-mist pt-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-ink uppercase tracking-wide mb-1">Default SEO</h3>
          <p className="text-xs text-ink-muted">Fallbacks when a post doesn't define its own.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="default_meta_title">Default meta title</Label>
          <Input
            id="default_meta_title"
            name="default_meta_title"
            defaultValue={settings?.default_meta_title ?? ""}
            disabled={disabled}
            maxLength={70}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="default_meta_description">Default meta description</Label>
          <Textarea
            id="default_meta_description"
            name="default_meta_description"
            rows={2}
            defaultValue={settings?.default_meta_description ?? ""}
            disabled={disabled}
            maxLength={160}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="default_og_image">Default Open Graph image URL</Label>
          <Input
            id="default_og_image"
            name="default_og_image"
            type="url"
            defaultValue={settings?.default_og_image ?? ""}
            disabled={disabled}
            placeholder="https://…/og.png"
          />
        </div>
      </div>

      <div className="border-t border-mist pt-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-ink uppercase tracking-wide mb-1">Social</h3>
          <p className="text-xs text-ink-muted">Used in metadata and the footer.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="twitter_handle">Twitter / X handle</Label>
            <Input
              id="twitter_handle"
              name="twitter_handle"
              defaultValue={settings?.twitter_handle ?? ""}
              disabled={disabled}
              placeholder="@trippyants"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
            <Input
              id="linkedin_url"
              name="linkedin_url"
              type="url"
              defaultValue={settings?.linkedin_url ?? ""}
              disabled={disabled}
              placeholder="https://linkedin.com/company/trippy-ants"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={disabled || isPending}>
          <Save className="h-4 w-4 mr-1.5" />
          {isPending ? "Saving…" : "Save settings"}
        </Button>
        {saved && (
          <span className="text-sm text-green-700 inline-flex items-center gap-1">
            <Check className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
