import { useState, useMemo } from "react";
import { ChevronDown, Eye, Search } from "lucide-react";

const SmartTable = ({ data = [], columns = [], title, actions }) => {
  // Inicializar columnas visibles
  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}),
  );
  const [search, setSearch] = useState("");
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Filtrado de datos
  const filteredData = useMemo(() => {
    if (!search) return data;
    const lowerSearch = search.toLowerCase();
    return data.filter((item) => {
      // Buscamos en los valores directos del objeto
      return Object.values(item).some((val) =>
        String(val).toLowerCase().includes(lowerSearch),
      );
    });
  }, [data, search]);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Buscador */}
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 border rounded-lg w-full focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Selector de Columnas */}
          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition"
            >
              <Eye size={18} />{" "}
              <span className="hidden sm:inline">Columnas</span>{" "}
              <ChevronDown size={14} />
            </button>

            {showColumnSelector && (
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-xl z-50 p-2">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded"
                  >
                    <input
                      type="checkbox"
                      checked={!!visibleColumns[col.key]}
                      onChange={() =>
                        setVisibleColumns((prev) => ({
                          ...prev,
                          [col.key]: !prev[col.key],
                        }))
                      }
                      className="mr-2 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {actions}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm uppercase">
              {columns.map(
                (col) =>
                  visibleColumns[col.key] && (
                    <th
                      key={col.key}
                      className="p-4 border-b font-semibold whitespace-nowrap"
                    >
                      {col.label}
                    </th>
                  ),
              )}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-8 text-center text-gray-500"
                >
                  No se encontraron resultados
                </td>
              </tr>
            ) : (
              filteredData.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className="hover:bg-blue-50 border-b last:border-0 transition-colors"
                >
                  {columns.map(
                    (col) =>
                      visibleColumns[col.key] && (
                        <td key={col.key} className="p-4 text-sm text-gray-700">
                          {/* Si tiene función render, la usa; si no, muestra el dato crudo */}
                          {col.render ? col.render(row) : row[col.key]}
                        </td>
                      ),
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Tabla */}
      <div className="p-4 border-t text-sm text-gray-500 flex justify-between">
        <span>Total: {data.length} registros</span>
        <span>Mostrando: {filteredData.length}</span>
      </div>
    </div>
  );
};

export default SmartTable;
