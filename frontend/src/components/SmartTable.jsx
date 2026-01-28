import { useState, useMemo, useEffect, useRef } from "react";
import {
  ChevronDown,
  Eye,
  Search,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const SmartTable = ({ data = [], columns = [], title, actions }) => {
  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}),
  );
  const [search, setSearch] = useState("");
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilterDropdown, setActiveFilterDropdown] = useState(null);
  const [filterSearchTerm, setFilterSearchTerm] = useState("");

  // ESTADO PARA ORDENAMIENTO
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setActiveFilterDropdown(null);
        setFilterSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilterChange = (columnKey, value) => {
    setColumnFilters((prev) => {
      const currentFilters = prev[columnKey] || [];
      const newFilters = currentFilters.includes(value)
        ? currentFilters.filter((f) => f !== value)
        : [...currentFilters, value];

      if (newFilters.length === 0) {
        const { [columnKey]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [columnKey]: newFilters };
    });
  };

  // Manejador de Ordenamiento
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filteredData = useMemo(() => {
    let result = Array.isArray(data) ? [...data] : [];

    // 1. Filtrado por Columnas
    Object.entries(columnFilters).forEach(([key, selectedValues]) => {
      if (selectedValues.length > 0) {
        result = result.filter((item) => {
          const itemValue = item[key];
          if (Array.isArray(itemValue)) {
            return itemValue.some((val) => selectedValues.includes(val));
          }
          return selectedValues.includes(itemValue);
        });
      }
    });

    // 2. Búsqueda Global
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter((item) => {
        return Object.values(item).some((val) => {
          if (val === null || val === undefined) return false;
          if (Array.isArray(val))
            return val.some((v) =>
              String(v).toLowerCase().includes(lowerSearch),
            );
          if (typeof val === "object") return false;
          return String(val).toLowerCase().includes(lowerSearch);
        });
      });
    }

    // 3. Ordenamiento
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || "";
        const bVal = b[sortConfig.key] || "";

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, search, columnFilters, sortConfig]);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 animate-fade-in pb-4">
      {/* Header General */}
      <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          <div className="relative flex-1 md:w-64 min-w-[200px]">
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

          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition"
            >
              <Eye size={18} />
              <span className="hidden sm:inline">Columnas</span>
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
      <div className="overflow-x-auto min-h-[300px]" ref={filterRef}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm uppercase border-b border-gray-200">
              {columns.map(
                (col) =>
                  visibleColumns[col.key] && (
                    <th
                      key={col.key}
                      className="p-4 font-semibold whitespace-nowrap relative group select-none"
                    >
                      <div className="flex items-center justify-between gap-1">
                        {/* Texto de Columna con Ordenamiento */}
                        <div
                          className={`flex items-center cursor-pointer hover:text-primary transition ${col.sortable ? "" : "cursor-default"}`}
                          onClick={() => col.sortable && handleSort(col.key)}
                        >
                          <span>{col.label}</span>
                          {col.sortable && (
                            <span className="ml-1 text-gray-400">
                              {sortConfig.key === col.key ? (
                                sortConfig.direction === "asc" ? (
                                  <ArrowUp size={14} />
                                ) : (
                                  <ArrowDown size={14} />
                                )
                              ) : (
                                <ArrowUpDown
                                  size={14}
                                  className="opacity-0 group-hover:opacity-50"
                                />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Botón de Filtro */}
                        {col.filterOptions && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeFilterDropdown !== col.filterKey) {
                                setFilterSearchTerm("");
                              }
                              setActiveFilterDropdown(
                                activeFilterDropdown === col.filterKey
                                  ? null
                                  : col.filterKey,
                              );
                            }}
                            className={`p-1 rounded transition-colors duration-200 ${
                              columnFilters[col.filterKey]?.length > 0 ||
                              activeFilterDropdown === col.filterKey
                                ? "text-primary bg-blue-50 ring-1 ring-blue-200"
                                : "text-gray-400 hover:text-primary hover:bg-gray-100"
                            }`}
                            title={`Filtrar por ${col.label}`}
                          >
                            <Filter
                              size={14}
                              fill={
                                columnFilters[col.filterKey]?.length > 0
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </button>
                        )}
                      </div>

                      {/* Dropdown de Filtro (Mismo código que antes) */}
                      {activeFilterDropdown === col.filterKey &&
                        col.filterOptions && (
                          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-fade-in flex flex-col max-h-80 cursor-default">
                            <div className="p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  Filtrar por {col.label}
                                </span>
                                <button
                                  onClick={() => setActiveFilterDropdown(null)}
                                >
                                  <X
                                    size={14}
                                    className="text-gray-400 hover:text-red-500"
                                  />
                                </button>
                              </div>
                              <div className="relative">
                                <Search
                                  className="absolute left-2 top-2 text-gray-400"
                                  size={12}
                                />
                                <input
                                  type="text"
                                  placeholder="Buscar en lista..."
                                  className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary focus:border-primary"
                                  value={filterSearchTerm}
                                  onChange={(e) =>
                                    setFilterSearchTerm(e.target.value)
                                  }
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>

                            <div className="overflow-y-auto p-2 space-y-1 flex-1">
                              {col.filterOptions
                                .filter((opt) =>
                                  opt
                                    .toLowerCase()
                                    .includes(filterSearchTerm.toLowerCase()),
                                )
                                .map((option) => (
                                  <label
                                    key={option}
                                    className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        columnFilters[col.filterKey]?.includes(
                                          option,
                                        ) || false
                                      }
                                      onChange={() =>
                                        handleFilterChange(
                                          col.filterKey,
                                          option,
                                        )
                                      }
                                      className="mr-2 text-primary focus:ring-primary rounded border-gray-300"
                                    />
                                    <span
                                      className="text-sm text-gray-700 normal-case font-normal truncate"
                                      title={option}
                                    >
                                      {option}
                                    </span>
                                  </label>
                                ))}
                              {col.filterOptions.filter((opt) =>
                                opt
                                  .toLowerCase()
                                  .includes(filterSearchTerm.toLowerCase()),
                              ).length === 0 && (
                                <div className="text-center text-xs text-gray-400 py-2">
                                  No hay coincidencias
                                </div>
                              )}
                            </div>

                            {columnFilters[col.filterKey]?.length > 0 && (
                              <div className="p-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                                <button
                                  onClick={() =>
                                    setColumnFilters((prev) => {
                                      const { [col.filterKey]: _, ...r } = prev;
                                      return r;
                                    })
                                  }
                                  className="text-xs text-red-600 font-medium hover:underline w-full text-center"
                                >
                                  Limpiar filtros (
                                  {columnFilters[col.filterKey].length})
                                </button>
                              </div>
                            )}
                          </div>
                        )}
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
                          {col.render ? col.render(row) : row[col.key] || "-"}
                        </td>
                      ),
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 pt-4 border-t border-gray-200 text-sm text-gray-500 flex justify-between">
        <span>Total visible: {filteredData.length}</span>
        <span>Total registros: {Array.isArray(data) ? data.length : 0}</span>
      </div>
    </div>
  );
};

export default SmartTable;
