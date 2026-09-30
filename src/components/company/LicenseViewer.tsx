"use client";

import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ExternalLink } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { DialogShell } from "@/components/ui/dialog-shell";
import { trackEvent } from "@/lib/analytics/track";

/** Zoom steps, relative to the whole document fitting its area (step 0 = 100%). */
const ZOOM_STEPS = [1, 1.25, 1.5, 2, 2.5, 3] as const;

/** Buttons at the end of the range stay focusable and say so, rather than dropping focus. */
const ZOOM_BUTTON = "aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

export interface LicenseViewerProps {
  image: { readonly src: string; readonly width: number; readonly height: number };
  /** Rendered on the server: what the image is, shown under the preview. */
  caption: ReactNode;
}

/**
 * The business license as an inline preview with a full-size view. The image is only ever scaled:
 * the preview is resized by next/image, the full-size view serves the original file unchanged.
 * The dialog has zoom in, zoom out and reset, and a keyboard-focusable scroll area for panning.
 * Text comes from the `companyInfo.license.viewer` messages (see LicenseDocument).
 */
export function LicenseViewer({ image, caption }: LicenseViewerProps) {
  const t = useTranslations("companyInfo.license.viewer");
  const locale = useLocale();
  const [step, setStep] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const focusPoint = useRef<{ x: number; y: number } | null>(null);

  const scale = ZOOM_STEPS[step] ?? 1;
  const canZoomOut = step > 0;
  const canZoomIn = step < ZOOM_STEPS.length - 1;

  // Keep the middle of what the reader is looking at in the middle after the image resizes.
  useLayoutEffect(() => {
    const element = viewport.current;
    const point = focusPoint.current;
    if (!element || !point) return;
    focusPoint.current = null;
    element.scrollLeft = point.x * element.scrollWidth - element.clientWidth / 2;
    element.scrollTop = point.y * element.scrollHeight - element.clientHeight / 2;
  }, [step]);

  function zoomTo(nextStep: number) {
    const element = viewport.current;
    if (element && element.scrollWidth > 0 && element.scrollHeight > 0) {
      focusPoint.current = {
        x: (element.scrollLeft + element.clientWidth / 2) / element.scrollWidth,
        y: (element.scrollTop + element.clientHeight / 2) / element.scrollHeight,
      };
    }
    setStep(nextStep);
  }

  function handleOpenChange(open: boolean) {
    if (!open) return;
    setStep(0);
    trackEvent("document_viewed", { document: "business-license", locale });
  }

  return (
    <figure className="grid gap-4">
      <div className="relative overflow-hidden rounded-lg border border-line bg-surface-2 shadow-card">
        <Image
          src={image.src}
          width={image.width}
          height={image.height}
          alt={t("previewAlt")}
          sizes="(min-width: 1024px) 704px, calc(100vw - 32px)"
          className="block h-auto w-full"
        />
        <DialogShell
          onOpenChange={handleOpenChange}
          title={t("dialogTitle")}
          description={t("dialogDescription")}
          closeLabel={t("close")}
          contentClassName="inset-0 m-auto h-[calc(100dvh-2rem)] max-h-[54rem] w-[calc(100%-2rem)] max-w-6xl rounded-lg"
          trigger={
            <button
              type="button"
              className="absolute inset-0 flex cursor-zoom-in items-end justify-end p-3 transition-colors hover:bg-navy-950/5 focus-visible:-outline-offset-4"
            >
              <span className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2.5 text-button text-navy-900 shadow-raised">
                <Maximize2 aria-hidden className="size-4" />
                {t("viewFullSize")}
              </span>
            </button>
          }
          footer={
            <ButtonLink
              href={image.src}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              size="sm"
            >
              {t("openOriginal")}
              <ExternalLink aria-hidden />
              <span className="sr-only">({t("opensInNewTab")})</span>
            </ButtonLink>
          }
        >
          <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-4">
            <div
              role="group"
              aria-label={t("zoomControls")}
              className="flex flex-wrap items-center gap-2"
            >
              <Button
                variant="outline"
                size="sm"
                aria-disabled={!canZoomOut || undefined}
                onClick={() => canZoomOut && zoomTo(step - 1)}
                className={ZOOM_BUTTON}
              >
                <ZoomOut aria-hidden />
                <span className="sr-only sm:not-sr-only">{t("zoomOut")}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-disabled={!canZoomIn || undefined}
                onClick={() => canZoomIn && zoomTo(step + 1)}
                className={ZOOM_BUTTON}
              >
                <ZoomIn aria-hidden />
                <span className="sr-only sm:not-sr-only">{t("zoomIn")}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-disabled={step === 0 || undefined}
                onClick={() => step > 0 && zoomTo(0)}
                className={ZOOM_BUTTON}
              >
                <RotateCcw aria-hidden />
                <span className="sr-only sm:not-sr-only">{t("zoomReset")}</span>
              </Button>
              <p role="status" className="ms-auto text-small text-ink-muted">
                {t("zoomLevel", { percent: `${Math.round(scale * 100)}%` })}
              </p>
            </div>
            {/*
              A photograph, not text: panning follows the picture, so the area is always left to
              right. At 100% the whole document fits the area (container query units), centered
              by auto margins that give way to scrolling; zooming multiplies that size.
            */}
            <div
              ref={viewport}
              role="region"
              tabIndex={0}
              dir="ltr"
              aria-label={t("scrollRegion")}
              className="[container-type:size] flex overflow-auto overscroll-contain rounded-md border border-line bg-surface-2"
            >
              <Image
                src={image.src}
                width={image.width}
                height={image.height}
                alt={t("dialogTitle")}
                unoptimized
                className="m-auto h-auto w-[calc(min(100cqw,100cqh*var(--ratio))*var(--zoom))] max-w-none shrink-0"
                style={{ "--zoom": scale, "--ratio": image.width / image.height } as CSSProperties}
              />
            </div>
          </div>
        </DialogShell>
      </div>
      <figcaption className="grid justify-items-start gap-1 text-small text-ink-muted">
        <p>{caption}</p>
        <ButtonLink href={image.src} target="_blank" rel="noopener noreferrer" variant="link">
          {t("openOriginal")}
          <ExternalLink aria-hidden />
          <span className="sr-only">({t("opensInNewTab")})</span>
        </ButtonLink>
      </figcaption>
    </figure>
  );
}
