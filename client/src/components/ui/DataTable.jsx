/**
 * Responsive table with an empty state.
 * @param {{
 *   columns: {key: string, header: string, render: (row: any) => import('react').ReactNode}[],
 *   rows: any[],
 *   getRowKey: (row: any) => string,
 *   emptyMessage?: string,
 *   bare?: boolean,
 * }} props `bare` drops the surrounding card (when already inside one).
 */
export default function DataTable({
  columns,
  rows,
  getRowKey,
  emptyMessage = "Nothing to show.",
  bare = false,
}) {
  return (
    <div className={bare ? "table-wrap" : "table-wrap surface"}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="table-empty">{emptyMessage}</div>}
    </div>
  );
}
