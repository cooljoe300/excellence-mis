import { CollegeOfficialLetterhead } from '@/components/documents/document-letterhead';
import type { ReportTable } from '@/lib/reports/build-report-table';

export function ReportPrintDocument({ table }: { table: ReportTable }) {
  return (
    <div
      id="report-document"
      className="print-document print-report-document mx-auto max-w-6xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      {table.landscape ? <style>{`@media print { @page { size: A4 landscape; margin: 1cm; } }`}</style> : null}
      <CollegeOfficialLetterhead documentTitle={table.title} />

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-600">
        <p>{table.summary}</p>
        {table.appliedFilters && table.appliedFilters.length > 0 && (
          <p>Filters: {table.appliedFilters.join(' · ')}</p>
        )}
      </div>

      {table.rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No records found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-800 bg-slate-50">
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-700 w-12">S/N</th>
                {table.headers.map((header) => (
                  <th
                    key={header}
                    className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-slate-200">
                  <td className="px-2 py-1.5 text-[11px] text-slate-600">{rowIndex + 1}</td>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-2 py-1.5 text-[11px] text-slate-800">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">
        EXCELLENCE ONLINE COLLEGE · Official report · {new Date().toLocaleString()}
      </footer>
    </div>
  );
}
