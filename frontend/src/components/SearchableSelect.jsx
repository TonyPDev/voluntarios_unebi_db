import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, X } from "lucide-react";

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = "Seleccionar...",
  label,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef(null);

  // Encontrar el objeto seleccionado basado en el ID (value)
  const selectedOption = options.find(
    (opt) => String(opt.id) === String(value),
  );

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrar opciones
  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSelect = (option) => {
    onChange(option.id);
    setIsOpen(false);
    setSearchTerm(""); // Limpiar búsqueda al seleccionar
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className="w-full relative" ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Input simulado (Trigger) */}
      <div
        className={`w-full border rounded p-2 flex items-center justify-between cursor-pointer bg-white ${error ? "border-red-500" : "border-gray-300"} focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span
          className={`block truncate ${!selectedOption ? "text-gray-400" : "text-gray-900"}`}
        >
          {selectedOption ? selectedOption.name : placeholder}
        </span>

        <div className="flex items-center">
          {selectedOption && (
            <button
              onClick={clearSelection}
              className="text-gray-400 hover:text-gray-600 mr-2"
              type="button"
            >
              <X size={16} />
            </button>
          )}
          <ChevronDown size={16} className="text-gray-400" />
        </div>
      </div>

      {/* Mensaje de Error */}
      {error && <span className="text-red-500 text-xs mt-1">{error}</span>}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 flex flex-col animate-fade-in">
          {/* Buscador interno */}
          <div className="p-2 border-b border-gray-100 sticky top-0 bg-white rounded-t-md">
            <div className="relative">
              <Search
                className="absolute left-2 top-2.5 text-gray-400"
                size={14}
              />
              <input
                type="text"
                className="w-full pl-8 pr-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary"
                placeholder="Buscar estudio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Lista de Opciones */}
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  className={`px-3 py-2 text-sm cursor-pointer rounded hover:bg-blue-50 ${String(value) === String(opt.id) ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-700"}`}
                  onClick={() => handleSelect(opt)}
                >
                  {opt.name}
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-gray-500">
                No se encontraron resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
