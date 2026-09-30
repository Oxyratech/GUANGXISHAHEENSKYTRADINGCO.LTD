"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SmartLink } from "@/components/ui/smart-link";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/locales";
import type { CountryOption } from "@/lib/countries";
import { contactSchema, type ContactData, type ContactInput } from "@/lib/validation/contact";
import { submitContactMessage } from "@/server/inquiries/actions";
import { ConsentField } from "./ConsentField";
import { CountryOptions } from "./CountryOptions";
import { FormErrorSummary } from "./FormErrorSummary";
import { FormFailure } from "./FormFailure";
import { HoneypotField } from "./HoneypotField";
import { SubmitRow } from "./SubmitRow";
import { SuccessPanel } from "./SuccessPanel";
import { useResolveMessage } from "./use-resolve-message";
import { useSubmissionForm } from "./use-submission-form";

export interface ContactFormProps {
  locale: Locale;
  countries: readonly CountryOption[];
}

type Field = keyof ContactInput;

/** On-screen order, which is also the order of the error summary. */
const FIELD_ORDER: readonly Field[] = [
  "name",
  "company",
  "email",
  "phone",
  "country",
  "message",
  "consent",
];

const DEFAULT_VALUES: ContactInput = {
  name: "",
  company: "",
  email: "",
  phone: "",
  country: "",
  message: "",
  consent: false,
};

const resolver = zodResolver(contactSchema);

const fieldId = (name: Field) => `contact-${name}`;

/** A general message to the team: the smaller of the two public forms. */
export function ContactForm({ locale, countries }: ContactFormProps) {
  const t = useTranslations("contact");
  const common = useTranslations("common");
  const resolve = useResolveMessage();

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
    honeypotRef,
    summaryRef,
    successRef,
  } = useSubmissionForm<ContactInput, ContactData, Field>({
    action: submitContactMessage,
    resolver,
    defaultValues: DEFAULT_VALUES,
    locale,
    fieldOrder: FIELD_ORDER,
    submittedEvent: "contact_submitted",
  });
  const { register, control } = form;

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
          <Button variant="outline" onClick={startAnother}>
            {t("success.another")}
          </Button>
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

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
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

      <div className="grid gap-5 sm:grid-cols-2">
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
        >
          <Input {...register("company")} autoComplete="organization" dir="auto" />
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
          id={fieldId("country")}
          label={t("form.fields.country.label")}
          error={error("country")}
          className="sm:col-span-2"
        >
          <Select {...register("country")} autoComplete="country">
            <CountryOptions placeholder={t("form.select.country")} countries={countries} />
          </Select>
        </FormField>
        <FormField
          id={fieldId("message")}
          label={t("form.fields.message.label")}
          hint={t("form.fields.message.hint")}
          error={error("message")}
          className="sm:col-span-2"
          required
        >
          <Textarea {...register("message")} rows={6} dir="auto" />
        </FormField>
      </div>

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
        <SubmitRow label={t("form.submit")} pendingLabel={t("form.submitting")} pending={pending} />
      </div>

      <HoneypotField ref={honeypotRef} label={t("form.honeypot")} />
    </form>
  );
}
