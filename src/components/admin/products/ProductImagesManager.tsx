"use client";

import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Star } from "lucide-react";
import { useState, type FormEvent } from "react";
import { MediaThumbnail } from "@/components/admin/media/MediaThumbnail";
import { ConfirmInputButton } from "@/components/admin/products/ConfirmInputButton";
import { useInputAction } from "@/components/admin/products/useInputAction";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/locales";
import { describeUploadPolicy, PRODUCT_IMAGE } from "@/server/storage";
import { formatBytes } from "@/server/admin/format";
import { MAX_PRODUCT_IMAGES } from "@/server/admin/products/schemas";
import {
  moveProductImage,
  removeProductImage,
  setPrimaryProductImage,
  updateProductImageTranslation,
  uploadProductImage,
} from "@/server/admin/products/image-actions";
import type { ProductEditImage } from "@/server/admin/products/detail";

const POLICY = describeUploadPolicy(PRODUCT_IMAGE);

function AltTextRow({
  productId,
  mediaAssetId,
  locale,
  defaultValue,
}: {
  productId: string;
  mediaAssetId: string;
  locale: Locale;
  defaultValue: string;
}) {
  const { run, pending } = useInputAction(updateProductImageTranslation);
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        run({ productId, mediaAssetId, locale, altText: value });
      }}
    >
      <label className="w-10 shrink-0 text-caption text-ink-muted">
        {locale.toUpperCase()}
      </label>
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        dir={LOCALE_META[locale].dir}
        maxLength={300}
        placeholder="Alt text"
        aria-label={`${LOCALE_META[locale].nativeName} alt text`}
      />
      <Button type="submit" size="sm" variant="outline" loading={pending}>
        Save
      </Button>
    </form>
  );
}

function ImageCard({ productId, image, isOnly }: { productId: string; image: ProductEditImage; isOnly: boolean }) {
  const router = useRouter();
  const setPrimary = useInputAction(setPrimaryProductImage);
  const move = useInputAction(moveProductImage);
  const altByLocale = new Map(image.translations.map((t) => [t.locale, t.altText ?? ""]));

  return (
    <li className="grid gap-3 rounded-lg border border-line bg-white p-3 shadow-card">
      <div className="flex gap-3">
        <div className="size-24 shrink-0 overflow-hidden rounded-md border border-line">
          <MediaThumbnail kind="IMAGE" visibility="PUBLIC" id={image.mediaAssetId} fileName={image.fileName} />
        </div>
        <div className="grid min-w-0 flex-1 content-start gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {image.isPrimary ? (
              <Badge variant="success">
                <Star aria-hidden className="size-3" /> Primary
              </Badge>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                loading={setPrimary.pending}
                onClick={() => setPrimary.run({ productId, imageId: image.id })}
              >
                Set as primary
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Move up"
              loading={move.pending}
              onClick={() => move.run({ productId, imageId: image.id, direction: "up" })}
            >
              <ArrowUp aria-hidden className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Move down"
              loading={move.pending}
              onClick={() => move.run({ productId, imageId: image.id, direction: "down" })}
            >
              <ArrowDown aria-hidden className="size-4" />
            </Button>
            <ConfirmInputButton
              action={removeProductImage}
              input={{ productId, imageId: image.id }}
              label="Remove"
              size="sm"
              title="Remove this image"
              description={
                isOnly
                  ? "This is the product's only image."
                  : "The image is removed from this product; if nothing else uses it, it is deleted."
              }
              confirmLabel="Remove image"
              successMessage="Image removed."
              onSuccess={() => router.refresh()}
            />
          </div>
          <p className="truncate text-caption text-ink-muted">
            {image.fileName} · {formatBytes(image.sizeBytes)}
            {image.width && image.height ? ` · ${image.width}×${image.height}` : ""}
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {LOCALES.map((locale) => (
          <AltTextRow
            key={locale}
            productId={productId}
            mediaAssetId={image.mediaAssetId}
            locale={locale}
            defaultValue={altByLocale.get(locale) ?? ""}
          />
        ))}
      </div>
    </li>
  );
}

/** Upload, reorder, mark primary, remove, and per-locale alt text — everything for a product's photos. */
export function ProductImagesManager({
  productId,
  images,
}: {
  productId: string;
  images: readonly ProductEditImage[];
}) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const atLimit = images.length >= MAX_PRODUCT_IMAGES;

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0 || busy) return;
    const form = event.currentTarget;
    setBusy(true);
    setError(null);

    for (const file of files) {
      const formData = new FormData();
      formData.set("productId", productId);
      formData.set("file", file);
      const state = await uploadProductImage(undefined, formData);
      if (state.status === "error") {
        setError(state.message);
        break;
      }
    }

    setBusy(false);
    setFiles([]);
    form.reset();
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={handleUpload} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-1.5">
          <label htmlFor="product-image-files" className="text-label text-ink">
            Add images
          </label>
          <Input
            id="product-image-files"
            type="file"
            multiple
            accept={POLICY.mimeTypes.join(",")}
            disabled={atLimit}
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          <p className="text-caption text-ink-muted">
            Up to {formatBytes(POLICY.maxBytes)} each. JPEG, PNG or WebP. At most {MAX_PRODUCT_IMAGES}{" "}
            images per product ({images.length} so far).
          </p>
        </div>
        <Button type="submit" loading={busy} disabled={files.length === 0 || atLimit}>
          Upload
        </Button>
      </form>
      {error ? <p className="text-small text-danger-600">{error}</p> : null}

      {images.length === 0 ? (
        <p className="text-small text-ink-muted">No images yet.</p>
      ) : (
        <ul className="grid gap-3">
          {images.map((image) => (
            <ImageCard key={image.id} productId={productId} image={image} isOnly={images.length === 1} />
          ))}
        </ul>
      )}
    </div>
  );
}
