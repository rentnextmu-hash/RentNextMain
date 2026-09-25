"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, type ImageBucket } from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * Drag-and-drop image field: previews the current image, resizes + converts
 * to WebP client-side (lib/storage.ts), uploads to a public bucket, and
 * reports the resulting public URL via onChange. Set value="" to clear.
 */
export function ImageUpload({
  bucket,
  value,
  onChange,
  label = "Image",
  hint,
}: {
  bucket: ImageBucket;
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImage(createClient(), bucket, file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text">{label}</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFile(e.dataTransfer.files[0]);
        }}
        className={cn(
          "relative flex items-center gap-4 rounded-[var(--radius-md)] border border-dashed p-3 transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border bg-surface",
        )}
      >
        <div className="relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-surface-alt">
          {value ? (
            <Image src={value} alt="" fill sizes="112px" className="object-contain p-1" />
          ) : (
            <ImagePlus className="h-7 w-7 text-primary/30" aria-hidden="true" />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-sm font-medium text-text hover:bg-surface-alt disabled:opacity-50"
            >
              <UploadCloud className="h-4 w-4" aria-hidden="true" />
              {value ? "Replace" : "Upload"}
            </button>
            {value && !uploading && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] px-3 text-sm font-medium text-text-muted hover:text-error"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-text-muted">
            {uploading ? "Uploading…" : (hint ?? "Drag an image here, or upload. Resized and optimised automatically.")}
          </p>
          {error && <p className="mt-1 text-xs text-error">{error}</p>}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
