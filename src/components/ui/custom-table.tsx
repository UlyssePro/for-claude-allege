"use client";

interface Column<T> {
  header: string;
  accessor: (row: T, idx: number) => React.ReactNode;
  className?: string;
  width?: string;
}

interface CustomTableProps<T> {
  columns: Column<T>[];
  data: T[];
  height?: string;
  onRowClick?: (row: T) => void;
}

export function CustomTable<T>({
  columns,
  data = [],
  onRowClick,
}: CustomTableProps<T>) {
  return (
    <div className="w-full h-full rounded-md border border-[rgb(55_65_81)] bg-[#1e1e21] overflow-hidden">
      <div className="overflow-y-auto scrollbar-none scrollbar-thumb-[rgb(13_18_107)]/30 scrollbar-track-transparent scrollbar-thumb-rounded-full max-h-[68vh]">
        <table
          className="w-full border-collapse text-sm"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            {columns.map((col, idx) => (
              <col
                key={idx}
                style={col.width ? { width: col.width } : undefined}
              />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[#1b2234]">
            <tr className="h-[2rem]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`p-1.5 ${col.header === "#" || col.header === "Classe" || col.header === "Date" ? "text-center" : col.header === "Actions" ? "text-right pr-4" : "text-left"} text-[11px] font-medium text-[rgb(203_210_224)] whitespace-nowrap ${col.className || ""}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgb(55_65_81)]">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-[rgb(156_163_175)]"
                >
                  Aucune donnée
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`hover:bg-[rgb(31_41_55)]/40 transition-colors h-[3rem] ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`${col.header === "Actions" ? "text-right pr-4" : "px-1.5"} py-1 text-sm ${col.className || ""} overflow-hidden text-ellipsis whitespace-nowrap h-[3rem]`}
                      style={
                        col.width
                          ? { width: col.width, maxWidth: col.width }
                          : undefined
                      }
                    >
                      {col.accessor(row, rowIdx)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="sticky bottom-0 z-10 bg-[#161922]">
              <td
                colSpan={columns.length}
                className="pl-5 py-[6px] text-left italic text-xs text-[rgb(179,178,177)]"
              >{`${data.length} Element${data.length > 1 ? "s" : ""} trouvé${data.length > 1 ? "s" : ""} sur ${data.length}.`}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
