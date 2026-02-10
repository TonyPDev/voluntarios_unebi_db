import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
  X,
} from "lucide-react";

const SmartTable = ({ data = [], columns = [], title, actions }) => {
  // --- 1. ESTADOS ---
  // Columnas visibles (inicialmente todas las que no tengan defaultHidden)
  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce(
      (acc, col) => ({ ...acc, [col.key]: !col.defaultHidden }),
      {},
    ),
  );

  // Búsqueda y Filtros
  const [search, setSearch] = useState("");
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [activeFilterDropdown, setActiveFilterDropdown] = useState(null);
  const [filterSearchTerm, setFilterSearchTerm] = useState("");

  // Ordenamiento
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Ancho de columnas (Redimensionable)
  const [columnWidths, setColumnWidths] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: col.width || 150 }), {}),
  );
  const [isResizing, setIsResizing] = useState(false);
  const resizingRef = useRef({ colKey: null, startX: 0, startWidth: 0 });
  const filterRef = useRef(null);

  // --- 2. LÓGICA DE REDIMENSIONAMIENTO ---
  const startResizing = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const currentWidth =
      parseInt(String(columnWidths[colKey]).replace("px", ""), 10) || 150;
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
    const diff = e.clientX - resizingRef.current.startX;
    setColumnWidths((prev) => ({
      ...prev,
      [resizingRef.current.colKey]: Math.max(
        50,
        resizingRef.current.startWidth + diff,
      ),
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

  // --- 3. MANEJO DE CLICK EXTERNO (Para cerrar menús) ---
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

  // --- 4. LÓGICA DE FILTRADO Y ORDENAMIENTO ---
  const handleFilterChange = (columnKey, value) => {
    setColumnFilters((prev) => {
      const current = prev[columnKey] || [];
      const newFilters = current.includes(value)
        ? current.filter((f) => f !== value)
        : [...current, value];

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

    // A. Filtros por Columna
    Object.entries(columnFilters).forEach(([key, selectedValues]) => {
      if (selectedValues.length > 0) {
        result = result.filter((item) => {
          const val = item[key];
          // Manejo si el valor es un array (ej. etiquetas) o simple
          return Array.isArray(val)
            ? val.some((v) => selectedValues.includes(v))
            : selectedValues.includes(val);
        });
      }
    });

    // B. Búsqueda Global
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((item) =>
        Object.values(item).some(
          (val) => val && String(val).toLowerCase().includes(lower),
        ),
      );
    }

    // C. Ordenamiento
    if (sortConfig.key) {
      const colDef = columns.find((c) => c.key === sortConfig.key);
      result.sort((a, b) => {
        if (colDef?.customSort) {
          const res = colDef.customSort(a, b);
          return sortConfig.direction === "asc" ? res : -res;
        }
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal == bVal) return 0;
        if (!aVal) return 1;
        if (!bVal) return -1;

        return (
          (aVal < bVal ? -1 : 1) * (sortConfig.direction === "asc" ? 1 : -1)
        );
      });
    }
    return result;
  }, [data, search, columnFilters, sortConfig, columns]);

  // --- 5. RENDERIZADO ---
  return (
    <div className="flex flex-col h-full w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
      {/* HEADER: Barra de Herramientas Estilo Base de Datos */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Título y Contador */}
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          {title}
          <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-normal border border-gray-200">
            {filteredData.length} registros
          </span>
        </h2>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Barra de Búsqueda */}
          <div className="relative group flex-1 sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Selector de Columnas */}
          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className={`flex items-center justify-center p-2 border rounded-lg transition-all shadow-sm ${showColumnSelector ? "bg-gray-100 border-gray-300" : "bg-white border-gray-200 hover:bg-gray-50"}`}
              title="Mostrar/Ocultar Columnas"
            >
              <Columns size={18} className="text-gray-600" />
            </button>

            {showColumnSelector && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-1 animate-fade-in">
                <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase border-b border-gray-100 mb-1">
                  Columnas Visibles
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {columns.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer rounded text-sm select-none"
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
                        className="mr-3 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Separador vertical */}
          <div className="h-6 w-px bg-gray-200 mx-1"></div>

          {/* Acciones Externas (Botones Nuevo/Importar pasados por props) */}
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </div>

      {/* TABLA: Diseño encapsulado */}
      <div
        className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        ref={filterRef}
      >
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-20 bg-gray-50 text-gray-600 font-semibold shadow-sm">
            <tr>
              {columns.map(
                (col) =>
                  visibleColumns[col.key] && (
                    <th
                      key={col.key}
                      style={{ width: columnWidths[col.key], minWidth: "80px" }}
                      className="group relative px-4 py-3 border-b border-r border-gray-200 last:border-r-0 select-none bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Texto Header + Ordenamiento */}
                        <div
                          className={`flex items-center gap-1 truncate ${col.sortable ? "cursor-pointer hover:text-gray-900" : "cursor-default"}`}
                          onClick={() => col.sortable && handleSort(col.key)}
                        >
                          {col.label}
                          {col.sortable && (
                            <span className="text-gray-400">
                              {sortConfig.key === col.key ? (
                                sortConfig.direction === "asc" ? (
                                  <ArrowUp
                                    size={12}
                                    className="text-blue-600"
                                  />
                                ) : (
                                  <ArrowDown
                                    size={12}
                                    className="text-blue-600"
                                  />
                                )
                              ) : (
                                <ArrowUpDown
                                  size={12}
                                  className="opacity-0 group-hover:opacity-50"
                                />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Botón de Filtro (Si existe filterOptions) */}
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
                            className={`p-1 rounded transition-colors ${
                              columnFilters[col.filterKey]?.length > 0
                                ? "text-blue-600 bg-blue-50"
                                : "text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200"
                            }`}
                          >
                            <Filter
                              size={12}
                              fill={
                                columnFilters[col.filterKey]?.length > 0
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          </button>
                        )}
                      </div>

                      {/* Redimensionador (Línea invisible a la derecha) */}
                      <div
                        onMouseDown={(e) => startResizing(e, col.key)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 hover:opacity-100 z-10"
                      />

                      {/* Dropdown de Filtro Específico */}
                      {activeFilterDropdown === col.filterKey && (
                        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-xl z-50 animate-fade-in flex flex-col font-normal text-gray-700">
                          <div className="p-2 border-b border-gray-100 bg-gray-50">
                            <input
                              autoFocus
                              placeholder={`Filtrar ${col.label}...`}
                              value={filterSearchTerm}
                              onChange={(e) =>
                                setFilterSearchTerm(e.target.value)
                              }
                              className="w-full text-xs p-1.5 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto p-1">
                            {col.filterOptions
                              .filter((o) =>
                                String(o)
                                  .toLowerCase()
                                  .includes(filterSearchTerm.toLowerCase()),
                              )
                              .map((opt) => (
                                <label
                                  key={opt}
                                  className="flex items-center px-2 py-1.5 hover:bg-blue-50 rounded cursor-pointer text-xs transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={columnFilters[
                                      col.filterKey
                                    ]?.includes(opt)}
                                    onChange={() =>
                                      handleFilterChange(col.filterKey, opt)
                                    }
                                    className="mr-2 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                                  />
                                  {opt}
                                </label>
                              ))}
                            {col.filterOptions.length === 0 && (
                              <div className="text-xs text-gray-400 p-2 text-center">
                                No hay opciones
                              </div>
                            )}
                          </div>
                          {/* Botón limpiar filtro */}
                          {columnFilters[col.filterKey]?.length > 0 && (
                            <div className="p-1 border-t border-gray-100 text-center">
                              <button
                                onClick={() =>
                                  setColumnFilters((prev) => {
                                    const { [col.filterKey]: _, ...rest } =
                                      prev;
                                    return rest;
                                  })
                                }
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium w-full py-1"
                              >
                                Limpiar Filtros
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
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-12 text-center text-gray-400 flex flex-col items-center justify-center"
                >
                  <Search size={48} className="mb-4 text-gray-200" />
                  <p className="text-lg font-medium text-gray-500">
                    No se encontraron resultados
                  </p>
                  <p className="text-sm">
                    Intenta ajustar los filtros o la búsqueda.
                  </p>
                </td>
              </tr>
            ) : (
              filteredData.map((row, i) => (
                <tr
                  key={row.id || i}
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  {columns.map(
                    (col) =>
                      visibleColumns[col.key] && (
                        <td
                          key={col.key}
                          className="px-4 py-2.5 border-r border-gray-100 last:border-r-0 truncate text-gray-700 align-middle"
                          style={{ maxWidth: columnWidths[col.key] }}
                          title={
                            typeof row[col.key] === "string" ? row[col.key] : ""
                          }
                        >
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

      {/* FOOTER: Resumen simple */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500 font-medium">
        <span>
          Mostrando {filteredData.length} de {data.length} registros
        </span>
        <div className="flex gap-4">
          {/* Aquí podrías poner botones de paginación si implementas paginación backend */}
          <span>Página 1</span>
        </div>
      </div>
    </div>
  );
};

export default SmartTable;
