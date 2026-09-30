"use client";

import { CircleAlert } from "lucide-react";
import { useId, useState } from "react";
import { useActionForm } from "@/components/admin/ActionForm";
import { ArticleBody } from "@/components/news/ArticleBody";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * The article body: Markdown in, with a "Preview" mode rendered through the same ArticleBody
 * component the public site uses, so what an editor sees here is what a reader will see. Both panels
 * stay mounted (only their visibility toggles) so the field submits its value from either one.
 *
 * The preview cannot resolve `/media/<id>` images the way the public page does (it has no id-to-size
 * lookup here), so an inline image shows as a link rather than a picture; the cover image has its own
 * separate field and preview.
 */
export function MarkdownEditor({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  const [content, setContent] = useState(defaultValue);
  const [previewing, setPreviewing] = useState(false);
  const { fieldErrors } = useActionForm();
  const error = fieldErrors[name]?.join(" ");
  const textareaId = useId();

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={textareaId}>{label}</Label>
        <div className="flex gap-1 rounded-md border border-line bg-surface p-0.5">
          <Button
            type="button"
            size="sm"
            variant={previewing ? "ghost" : "outline"}
            aria-pressed={!previewing}
            onClick={() => setPreviewing(false)}
          >
            Write
          </Button>
          <Button
            type="button"
            size="sm"
            variant={previewing ? "outline" : "ghost"}
            aria-pressed={previewing}
            onClick={() => setPreviewing(true)}
          >
            Preview
          </Button>
        </div>
      </div>

      <div hidden={previewing}>
        <Textarea
          id={textareaId}
          name={name}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={20}
          aria-invalid={error ? true : undefined}
          className="min-h-96 font-mono text-small"
        />
      </div>
      <div hidden={!previewing} className={cn("min-h-96 rounded-md border border-line p-4")}>
        {content.trim() ? (
          <ArticleBody
            markdown={content}
            images={{}}
            labels={{ opensInNewTab: "opens in a new tab" }}
          />
        ) : (
          <p className="text-small text-ink-muted">Nothing to preview yet.</p>
        )}
      </div>

      {error ? (
        <p className="flex items-start gap-1.5 text-small text-danger-600">
          <CircleAlert aria-hidden className="mt-[0.2em] size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
