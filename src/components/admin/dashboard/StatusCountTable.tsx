import { StatusBadge } from "@/components/admin/StatusBadge";
import type { StatusCount } from "@/server/admin/dashboard/status-counts";

/** Counts per status as a small real table: the status in words, the number, and the total. */
export function StatusCountTable({
  title,
  counts,
  total,
}: {
  title: string;
  counts: readonly StatusCount[];
  total: number;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-card">
      <table className="w-full text-small">
        <caption className="pb-2 text-start text-body font-semibold text-navy-900">{title}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Status</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {counts.map((entry) => (
            <tr key={entry.status} className="border-t border-line">
              <th scope="row" className="py-2 text-start font-normal">
                <StatusBadge status={entry.status} />
              </th>
              <td className="py-2 text-end tabular-nums">{entry.count.toLocaleString("en-US")}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line-strong font-medium text-navy-900">
            <th scope="row" className="py-2 text-start font-medium">
              Total
            </th>
            <td className="py-2 text-end tabular-nums">{total.toLocaleString("en-US")}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
