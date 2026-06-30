import { DocumentLetterhead } from '@/components/documents/document-letterhead';
import type { ReportTable } from '@/lib/reports/build-report-table';

export function ReportPrintDocument({ table }: { table: ReportTable }) {
  return (
    <div
      id="report-document"
      className="print-document mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <DocumentLetterhead
        documentTitle={table.title}
        documentSubtitle="Institutional Report"
        rightMeta={<p className="text-xs text-slate-500">{table.summary}</p>}
      />

      {table.rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No records match the current filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50">
                {table.headers.map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-slate-100">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2.5 text-slate-800">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        Official report — Excellence Online College
      </footer>
    </div>
  );
}
