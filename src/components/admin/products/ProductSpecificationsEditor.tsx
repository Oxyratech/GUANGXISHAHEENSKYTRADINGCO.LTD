"use client";

import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ConfirmInputButton } from "@/components/admin/products/ConfirmInputButton";
import { useInputAction } from "@/components/admin/products/useInputAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/locales";
import type { ProductEditSpecification } from "@/server/admin/products/detail";
import {
  addProductSpecification,
  moveProductSpecification,
  removeProductSpecification,
  updateProductSpecificationTranslation,
} from "@/server/admin/products/specification-actions";
import { MAX_PRODUCT_SPECIFICATIONS } from "@/server/admin/products/schemas";

function SpecRow({
  productId,
  specification,
  locale,
  index,
  count,
}: {
  productId: string;
  specification: ProductEditSpecification;
  locale: Locale;
  index: number;
  count: number;
}) {
  const router = useRouter();
  const translation = specification.translations.find((t) => t.locale === locale);
  const [label, setLabel] = useState(translation?.label ?? "");
  const [value, setValue] = useState(translation?.value ?? "");
  const save = useInputAction(updateProductSpecificationTranslation);
  const move = useInputAction(moveProductSpecification);

  return (
    <tr className="border-b border-line last:border-b-0">
      <td className="p-2 align-top">
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Move up"
            disabled={index === 0}
            loading={move.pending}
            onClick={() =>
              move.run({ productId, specificationId: specification.id, direction: "up" })
            }
          >
            <ArrowUp aria-hidden className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Move down"
            disabled={index === count - 1}
            loading={move.pending}
            onClick={() =>
              move.run({ productId, specificationId: specification.id, direction: "down" })
            }
          >
            <ArrowDown aria-hidden className="size-4" />
          </Button>
        </div>
      </td>
      <td className="p-2 align-top">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            save.run({ productId, specificationId: specification.id, locale, label, value });
          }}
        >
          <Input
            aria-label="Label"
            placeholder="Label"
            dir={LOCALE_META[locale].dir}
            maxLength={200}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="min-w-32 flex-1"
          />
          <Input
            aria-label="Value"
            placeholder="Value"
            dir={LOCALE_META[locale].dir}
            maxLength={500}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="min-w-32 flex-1"
          />
          <Button type="submit" size="sm" variant="outline" loading={save.pending}>
            Save
          </Button>
        </form>
      </td>
      <td className="p-2 align-top">
        <ConfirmInputButton
          action={removeProductSpecification}
          input={{ productId, specificationId: specification.id }}
          label="Remove"
          size="sm"
          title="Remove this specification row"
          description="This removes the row for every language, not only the one you are viewing."
          confirmLabel="Remove row"
          successMessage="Specification row removed."
          onSuccess={() => router.refresh()}
        />
      </td>
    </tr>
  );
}

/** Ordered label/value rows, one locale tab at a time. A row is language-neutral: add/remove/reorder affect every locale at once. */
export function ProductSpecificationsEditor({
  productId,
  specifications,
}: {
  productId: string;
  specifications: readonly ProductEditSpecification[];
}) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("en");
  const add = useInputAction(addProductSpecification);
  const atLimit = specifications.length >= MAX_PRODUCT_SPECIFICATIONS;

  return (
    <div className="grid gap-4">
      <Tabs value={locale} onValueChange={(value) => setLocale(value as Locale)}>
        <TabsList aria-label="Specification language">
          {LOCALES.map((value) => (
            <TabsTrigger key={value} value={value}>
              {LOCALE_META[value].nativeName}
            </TabsTrigger>
          ))}
        </TabsList>
        {LOCALES.map((value) => (
          <TabsContent key={value} value={value}>
            {specifications.length === 0 ? (
              <p className="text-small text-ink-muted">No specification rows yet.</p>
            ) : (
              <table className="w-full border-collapse text-small">
                <caption className="sr-only">Specifications ({LOCALE_META[value].nativeName})</caption>
                <thead>
                  <tr className="border-y border-line bg-surface text-label text-ink-muted">
                    <th scope="col" className="p-2 text-start">
                      Order
                    </th>
                    <th scope="col" className="p-2 text-start">
                      Label / value
                    </th>
                    <th scope="col" className="p-2 text-start">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {specifications.map((specification, index) => (
                    <SpecRow
                      key={specification.id}
                      productId={productId}
                      specification={specification}
                      locale={value}
                      index={index}
                      count={specifications.length}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </TabsContent>
        ))}
      </Tabs>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={add.pending}
          disabled={atLimit}
          onClick={() => add.run({ productId }, () => router.refresh())}
        >
          <Plus aria-hidden className="size-4" /> Add specification row
        </Button>
        {atLimit ? (
          <p className="mt-1 text-caption text-ink-muted">
            A product can have at most {MAX_PRODUCT_SPECIFICATIONS} specification rows.
          </p>
        ) : null}
      </div>
    </div>
  );
}
