import { useId } from "react";

export interface CookieTableRow {
  id: string;
  name: string;
  purpose: string;
  setFor: string;
  lifetime: string;
}

/**
 * The cookies the site sets, as a semantic table. It scrolls sideways on a narrow screen inside a
 * focusable, named region, so keyboard users can reach every column. Cookie names are code, so
 * they are shown left-to-right in every language.
 */
export function CookieTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: Omit<CookieTableRow, "id">;
  rows: readonly CookieTableRow[];
}) {
  const captionId = useId();

  return (
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-line bg-white"
    >
      <table className="min-w-[36rem]">
        <caption id={captionId} className="px-4 py-3 text-start text-label text-ink">
          {caption}
        </caption>
        <thead>
          <tr className="bg-surface">
            {(["name", "purpose", "setFor", "lifetime"] as const).map((key) => (
              <th key={key} scope="col" className="ps-4">
                {headers[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              <th scope="row" className="ps-4">
                <code dir="ltr">{row.name}</code>
              </th>
              <td className="ps-4">{row.purpose}</td>
              <td className="ps-4">{row.setFor}</td>
              <td className="ps-4">{row.lifetime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
