import type { CountryOption } from "@/lib/countries";

/** The <option> list of a country <select>: a leading empty choice, then every country by name. */
export function CountryOptions({
  placeholder,
  countries,
}: {
  placeholder: string;
  countries: readonly CountryOption[];
}) {
  return (
    <>
      <option value="">{placeholder}</option>
      {countries.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name}
        </option>
      ))}
    </>
  );
}
