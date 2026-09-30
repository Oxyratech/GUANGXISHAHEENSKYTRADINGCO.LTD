"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFormatter, useTranslations } from "next-intl";
import { Suspense, useCallback } from "react";
import { Controller, type Resolver } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SmartLink } from "@/components/ui/smart-link";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/locales";
import type { CountryOption } from "@/lib/countries";
import { displayExtension, toMegabytes, type UploadRules } from "@/lib/validation/attachment";
import { localDeliveryWindow } from "@/lib/validation/dates";
import {
  createInquiryFormSchema,
  type InquiryFormData,
  type InquiryFormInput,
} from "@/lib/validation/inquiry";
import type { InquiryPrefill } from "@/lib/validation/prefill";
import { submitInquiry } from "@/server/inquiries/actions";
import { ConsentField } from "./ConsentField";
import { CountryOptions } from "./CountryOptions";
import { FieldGroup } from "./FieldGroup";
import { FileField } from "./FileField";
import { FormErrorSummary } from "./FormErrorSummary";
import { FormFailure } from "./FormFailure";
import { HoneypotField } from "./HoneypotField";
import { PrefillFromUrl } from "./PrefillFromUrl";
import { SubmitRow } from "./SubmitRow";
import { SuccessPanel } from "./SuccessPanel";
import { useDeliveryWindow } from "./use-local-date";
import { useResolveMessage } from "./use-resolve-message";
import { useSubmissionForm } from "./use-submission-form";

export interface CategoryOption {
  /** A category slug, or "other". */
  value: string;
  label: string;
}

export interface InquiryFormProps {
  locale: Locale;
  countries: readonly CountryOption[];
  /** The twelve categories and "Other / not sure", already translated. */
  categories: readonly CategoryOption[];
  upload: UploadRules;
}

/** Every field the visitor sees; productSlug is a hidden reference and has no label. */
type Field = Exclude<keyof InquiryFormInput, "productSlug">;

/** On-screen order, which is also the order of the error summary. */
const FIELD_ORDER: readonly Field[] = [
  "name",
  "company",
  "country",
  "email",
  "phone",
  "whatsapp",
  "product",
  "category",
  "quantity",
  "specification",
  "targetPrice",
  "destinationCountry",
  "requiredDeliveryDate",
  "additionalRequirements",
  "attachment",
  "consent",
];

const DEFAULT_VALUES: InquiryFormInput = {
  name: "",
  company: "",
  country: "",
  email: "",
  phone: "",
  whatsapp: "",
  product: "",
  productSlug: "",
  category: "",
  quantity: "",
  specification: "",
  targetPrice: "",
  destinationCountry: "",
  requiredDeliveryDate: "",
  additionalRequirements: "",
  consent: false,
  attachment: null,
};

const fieldId = (name: Field) => `inquiry-${name}`;

/** Only the category leaves the browser as an analytics property: a slug, never anything personal. */
function submittedProps(values: InquiryFormInput) {
  return values.category ? { category: values.category } : {};
}

export function InquiryForm({ locale, countries, categories, upload }: InquiryFormProps) {
  const t = useTranslations("inquiry");
  const common = useTranslations("common");
  const resolve = useResolveMessage();
  const format = useFormatter();
  const deliveryWindow = useDeliveryWindow();

  // Built per validation: "today" is read when the visitor submits, not when the page loaded.
  const resolver = useCallback<Resolver<InquiryFormInput, unknown, InquiryFormData>>(
    (values, context, options) =>
      zodResolver(createInquiryFormSchema(localDeliveryWindow(), upload))(values, context, options),
    [upload],
  );

  const {
    form,
    formAction,
    onSubmit,
    pending,
    success,
    formError,
    problems,
    messageFor,
    retry,
    startAnother,
    markStarted,
    honeypotRef,
    summaryRef,
    successRef,
  } = useSubmissionForm<InquiryFormInput, InquiryFormData, Field>({
    action: submitInquiry,
    resolver,
    defaultValues: DEFAULT_VALUES,
    locale,
    fieldOrder: FIELD_ORDER,
    startedEvent: "inquiry_started",
    submittedEvent: "inquiry_submitted",
    submittedProps,
  });
  const { register, control } = form;

  // A link may carry a product or category; it never overwrites what the visitor already typed.
  const applyPrefill = useCallback(
    (prefill: InquiryPrefill) => {
      for (const [name, value] of Object.entries(prefill) as [keyof InquiryPrefill, string][]) {
        if (!form.getFieldState(name).isDirty && !form.getValues(name)) form.setValue(name, value);
      }
    },
    [form],
  );

  const error = (name: Field) => {
    const key = messageFor(name);
    return key ? resolve(key) : undefined;
  };

  if (success) {
    return (
      <SuccessPanel
        ref={successRef}
        title={t("success.title")}
        lead={t("success.lead")}
        referenceLabel={t("success.referenceLabel")}
        referenceCode={success.referenceCode}
        referenceHint={t("success.referenceHint")}
        next={t("success.next")}
        actions={
          <>
            <Button variant="outline" onClick={startAnother}>
              {t("success.another")}
            </Button>
            <ButtonLink href="/products" variant="ghost">
              {t("success.browse")}
            </ButtonLink>
          </>
        }
      />
    );
  }

  const consentLabel = t.rich("form.consent", {
    privacy: (chunks) => (
      <SmartLink
        href="/privacy-policy"
        target="_blank"
        className="text-blue-600 underline underline-offset-4 hover:text-blue-800"
      >
        {chunks}
        <span className="sr-only"> ({common("a11y.opensInNewTab")})</span>
      </SmartLink>
    ),
  });

  const attachmentTypes = format.list(upload.extensions.map(displayExtension), {
    type: "disjunction",
  });

  return (
    <>
      <Suspense fallback={null}>
        <PrefillFromUrl apply={applyPrefill} />
      </Suspense>
      <form
        action={formAction}
        onSubmit={onSubmit}
        onFocus={markStarted}
        onChange={markStarted}
        noValidate
        aria-busy={pending}
        className="relative grid gap-8"
      >
        <div className="grid gap-4">
          <p className="text-small text-ink-muted">{t("form.requiredNote")}</p>
          <noscript>
            <Alert variant="warning">{t("form.noscript")}</Alert>
          </noscript>
          <FormErrorSummary
            ref={summaryRef}
            title={t("form.summaryTitle")}
            items={problems.map(({ name, message }) => ({
              id: fieldId(name),
              label: t(`form.fields.${name}.label`),
              message: resolve(message),
            }))}
          />
          {formError ? (
            <FormFailure
              title={t("form.error.title")}
              message={resolve(formError)}
              hint={t("form.error.hint")}
              retryLabel={t("form.error.retry")}
              onRetry={retry}
              pending={pending}
            />
          ) : null}
        </div>

        <input type="hidden" {...register("productSlug")} />

        <FieldGroup legend={t("form.groups.contact")}>
          <FormField
            id={fieldId("name")}
            label={t("form.fields.name.label")}
            error={error("name")}
            required
          >
            <Input {...register("name")} autoComplete="name" dir="auto" />
          </FormField>
          <FormField
            id={fieldId("company")}
            label={t("form.fields.company.label")}
            error={error("company")}
            required
          >
            <Input {...register("company")} autoComplete="organization" dir="auto" />
          </FormField>
          <FormField
            id={fieldId("country")}
            label={t("form.fields.country.label")}
            error={error("country")}
            required
          >
            <Select {...register("country")} autoComplete="country">
              <CountryOptions placeholder={t("form.select.country")} countries={countries} />
            </Select>
          </FormField>
          <FormField
            id={fieldId("email")}
            label={t("form.fields.email.label")}
            error={error("email")}
            required
          >
            <Input
              {...register("email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              dir="ltr"
            />
          </FormField>
          <FormField
            id={fieldId("phone")}
            label={t("form.fields.phone.label")}
            hint={t("form.fields.phone.hint")}
            error={error("phone")}
          >
            <Input {...register("phone")} type="tel" autoComplete="tel" dir="ltr" />
          </FormField>
          <FormField
            id={fieldId("whatsapp")}
            label={t("form.fields.whatsapp.label")}
            hint={t("form.fields.whatsapp.hint")}
            error={error("whatsapp")}
          >
            <Input {...register("whatsapp")} type="tel" autoComplete="off" dir="ltr" />
          </FormField>
        </FieldGroup>

        <FieldGroup legend={t("form.groups.product")}>
          <FormField
            id={fieldId("product")}
            label={t("form.fields.product.label")}
            hint={t("form.fields.product.hint")}
            error={error("product")}
            className="sm:col-span-2"
            required
          >
            <Input {...register("product")} autoComplete="off" dir="auto" />
          </FormField>
          <FormField
            id={fieldId("category")}
            label={t("form.fields.category.label")}
            error={error("category")}
          >
            <Select {...register("category")}>
              <option value="">{t("form.select.category")}</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            id={fieldId("quantity")}
            label={t("form.fields.quantity.label")}
            hint={t("form.fields.quantity.hint")}
            error={error("quantity")}
          >
            <Input {...register("quantity")} autoComplete="off" dir="auto" />
          </FormField>
          <FormField
            id={fieldId("specification")}
            label={t("form.fields.specification.label")}
            hint={t("form.fields.specification.hint")}
            error={error("specification")}
            className="sm:col-span-2"
          >
            <Textarea {...register("specification")} rows={5} dir="auto" />
          </FormField>
        </FieldGroup>

        <FieldGroup legend={t("form.groups.delivery")}>
          <FormField
            id={fieldId("targetPrice")}
            label={t("form.fields.targetPrice.label")}
            hint={t("form.fields.targetPrice.hint")}
            error={error("targetPrice")}
          >
            <Input {...register("targetPrice")} autoComplete="off" dir="auto" />
          </FormField>
          <FormField
            id={fieldId("destinationCountry")}
            label={t("form.fields.destinationCountry.label")}
            hint={t("form.fields.destinationCountry.hint")}
            error={error("destinationCountry")}
          >
            <Select {...register("destinationCountry")}>
              <CountryOptions
                placeholder={t("form.select.destinationCountry")}
                countries={countries}
              />
            </Select>
          </FormField>
          <FormField
            id={fieldId("requiredDeliveryDate")}
            label={t("form.fields.requiredDeliveryDate.label")}
            hint={t("form.fields.requiredDeliveryDate.hint")}
            error={error("requiredDeliveryDate")}
          >
            <Input
              {...register("requiredDeliveryDate")}
              type="date"
              min={deliveryWindow?.earliest}
              max={deliveryWindow?.latest}
            />
          </FormField>
        </FieldGroup>

        <FieldGroup legend={t("form.groups.extra")}>
          <FormField
            id={fieldId("additionalRequirements")}
            label={t("form.fields.additionalRequirements.label")}
            error={error("additionalRequirements")}
            className="sm:col-span-2"
          >
            <Textarea {...register("additionalRequirements")} rows={5} dir="auto" />
          </FormField>
          <Controller
            control={control}
            name="attachment"
            render={({ field }) => (
              <FormField
                id={fieldId("attachment")}
                label={t("form.fields.attachment.label")}
                hint={t("form.attachment.hint", {
                  size: toMegabytes(upload.maxBytes),
                  types: attachmentTypes,
                })}
                error={error("attachment")}
                className="sm:col-span-2"
              >
                {(controlProps) => (
                  <FileField
                    control={controlProps}
                    rules={upload}
                    file={field.value ?? null}
                    onChange={(file) => {
                      field.onChange(file);
                      void form.trigger("attachment");
                    }}
                    labels={{
                      choose: t("form.attachment.choose"),
                      replace: t("form.attachment.replace"),
                      none: t("form.attachment.none"),
                      remove: t("form.attachment.remove"),
                      removeNamed: (name) => t("form.attachment.removeNamed", { name }),
                    }}
                  />
                )}
              </FormField>
            )}
          />
        </FieldGroup>

        <div className="grid gap-5">
          <Controller
            control={control}
            name="consent"
            render={({ field }) => (
              <ConsentField
                ref={field.ref}
                id={fieldId("consent")}
                name={field.name}
                label={consentLabel}
                checked={field.value === true}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
                error={error("consent")}
              />
            )}
          />
          <SubmitRow
            label={t("form.submit")}
            pendingLabel={t("form.submitting")}
            pending={pending}
          />
        </div>

        <HoneypotField ref={honeypotRef} label={t("form.honeypot")} />
      </form>
    </>
  );
}
