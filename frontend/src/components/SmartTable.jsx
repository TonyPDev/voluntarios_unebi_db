import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
  // Inicialización de columnas visibles (soporta defaultHidden)
  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce(
      (acc, col) => ({ ...acc, [col.key]: !col.defaultHidden }),
      {},
    ),
  );

  const [search, setSearch] = useState("");
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilterDropdown, setActiveFilterDropdown] = useState(null);
  const [filterSearchTerm, setFilterSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // --- LÓGICA DE REDIMENSIONAMIENTO ---
  const [columnWidths, setColumnWidths] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: col.width || 150 }), {}),
  );
  const [isResizing, setIsResizing] = useState(false);
  const resizingRef = useRef({ colKey: null, startX: 0, startWidth: 0 });

  const startResizing = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    // Convertir a número para cálculos
    const currentWidthStr = String(columnWidths[colKey]);
    const currentWidth = parseInt(currentWidthStr.replace("px", ""), 10) || 150;

    resizingRef.current = {
      colKey,
      startX: e.clientX,
      startWidth: currentWidth,
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = useCallback((e) => {
    if (!resizingRef.current.colKey) return;

    const { colKey, startX, startWidth } = resizingRef.current;
    const diff = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + diff); // Mínimo 50px

    setColumnWidths((prev) => ({
      ...prev,
      [colKey]: newWidth,
    }));
  }, []);

  const stopResizing = () => {
    setIsResizing(false);
    resizingRef.current = { colKey: null, startX: 0, startWidth: 0 };
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

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

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filteredData = useMemo(() => {
    let result = Array.isArray(data) ? [...data] : [];

    // Filtrado
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

    // Búsqueda
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

    // Ordenamiento
    if (sortConfig.key) {
      const colDef = columns.find((c) => c.key === sortConfig.key);

      result.sort((a, b) => {
        if (colDef && colDef.customSort) {
          const sortResult = colDef.customSort(a, b);
          return sortConfig.direction === "asc" ? sortResult : -sortResult;
        }
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, search, columnFilters, sortConfig, columns]);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 animate-fade-in pb-4 flex flex-col h-full w-full max-w-full overflow-hidden">
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
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-xl z-50 p-2 max-h-60 overflow-y-auto">
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

      <div className="overflow-x-auto w-full flex-1" ref={filterRef}>
        {/* Agregamos min-w-full para que ocupe todo el ancho disponible */}
        <table
          className="min-w-full text-left border-collapse"
          style={{ tableLayout: "fixed" }}
        >
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm uppercase border-b border-gray-200">
              {columns.map(
                (col) =>
                  visibleColumns[col.key] && (
                    <th
                      key={col.key}
                      style={{ width: columnWidths[col.key] }}
                      className="p-4 font-semibold whitespace-nowrap relative group select-none border-r border-transparent hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1 overflow-hidden">
                        <div
                          className={`flex items-center cursor-pointer hover:text-primary transition truncate ${col.sortable ? "" : "cursor-default"}`}
                          onClick={() => col.sortable && handleSort(col.key)}
                          title={col.label}
                        >
                          <span className="truncate">{col.label}</span>
                          {col.sortable && (
                            <span className="ml-1 text-gray-400 flex-shrink-0">
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
                        {col.filterOptions && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeFilterDropdown !== col.filterKey)
                                setFilterSearchTerm("");
                              setActiveFilterDropdown(
                                activeFilterDropdown === col.filterKey
                                  ? null
                                  : col.filterKey,
                              );
                            }}
                            className={`p-1 rounded transition-colors duration-200 flex-shrink-0 ${
                              columnFilters[col.filterKey]?.length > 0 ||
                              activeFilterDropdown === col.filterKey
                                ? "text-primary bg-blue-50 ring-1 ring-blue-200"
                                : "text-gray-400 hover:text-primary hover:bg-gray-100"
                            }`}
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
                      <div
                        onMouseDown={(e) => startResizing(e, col.key)}
                        className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize z-20 flex justify-center hover:bg-blue-50 opacity-0 hover:opacity-100 transition-opacity"
                        style={{ right: "-6px" }}
                      >
                        <div className="w-px h-full bg-blue-300"></div>
                      </div>
                      {activeFilterDropdown === col.filterKey &&
                        col.filterOptions && (
                          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-fade-in flex flex-col max-h-80 cursor-default">
                            <div className="p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-gray-500 uppercase">
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
                                  placeholder="Buscar..."
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
                                  String(opt)
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
                                      className="text-sm text-gray-700 truncate"
                                      title={option}
                                    >
                                      {option}
                                    </span>
                                  </label>
                                ))}
                              {col.filterOptions.filter((opt) =>
                                String(opt)
                                  .toLowerCase()
                                  .includes(filterSearchTerm.toLowerCase()),
                              ).length === 0 && (
                                <div className="text-center text-xs text-gray-400 py-2">
                                  No hay resultados
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
                                  Limpiar filtros
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
                  className="hover:bg-blue-50 border-b last:border-0 transition-colors group/row"
                >
                  {columns.map(
                    (col) =>
                      visibleColumns[col.key] && (
                        <td
                          key={col.key}
                          className="p-4 text-sm text-gray-700 truncate border-r border-transparent group-hover/row:border-gray-100"
                          style={{
                            maxWidth: columnWidths[col.key],
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={
                            typeof row[col.key] === "string" ? row[col.key] : ""
                          }
                        >
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
