import { useEffect, useState, useContext, useMemo, useCallback } from "react";
import api from "../api/axios";
import {
  Edit,
  Plus,
  Eye,
  FileSpreadsheet,
  Users,
  UserCheck,
  FlaskConical,
  CalendarClock, // Para Asignado
  ClipboardList, // Para Por Aprobación
  Hourglass, // Para Descanso
  Ban,
  X,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import Modal from "../components/Modal";
import SmartTable from "../components/SmartTable";
import { AuthContext } from "../context/AuthContext";
import VolunteerForm from "./VolunteerForm";
import ParticipationManager from "../components/ParticipationManager";

const VolunteerList = () => {
  const { user } = useContext(AuthContext);

  // --- Estados de Datos ---
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Estados de Interfaz ---
  const [activeTab, setActiveTab] = useState("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [showHistoryFor, setShowHistoryFor] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  // --- 1. CARGA DE DATOS (POLLING) ---
  const fetchVolunteers = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);

    try {
      const res = await api.get("volunteers/");

      const processedData = res.data.map((v) => ({
        ...v,
        full_name_search:
          `${v.first_name} ${v.middle_name || ""} ${v.last_name_paternal} ${v.last_name_maternal}`.trim(),
        study_names_filter: v.participations?.map((p) => p.study_name) || [],
        raw_status: v.status, // Guardamos estatus original

        // Datos calculados para filtros y ordenamiento
        creation_date_fmt: new Date(v.created_at).toLocaleDateString(),
        creation_year_filter: new Date(v.created_at).getFullYear().toString(),
        code_year_filter: v.code ? v.code.split("-")[1] : "",
        code_number_sort: v.code ? parseInt(v.code.split("-")[2] || 0) : 0,
      }));

      setVolunteers(processedData);
    } catch (error) {
      console.error("Error cargando voluntarios", error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVolunteers(false);
    const intervalId = setInterval(() => fetchVolunteers(true), 5000);
    return () => clearInterval(intervalId);
  }, [fetchVolunteers]);

  // --- 2. LÓGICA DE FILTRADO Y CONTEOS ---

  // Calculamos los totales para cada pestaña
  const counts = useMemo(() => {
    return {
      todos: volunteers.length,
      aptos: volunteers.filter((v) => v.raw_status === "Apto").length,
      en_estudio: volunteers.filter((v) => v.raw_status === "En estudio")
        .length,
      asignado: volunteers.filter((v) => v.raw_status === "Estudio asignado")
        .length,
      por_aprobacion: volunteers.filter(
        (v) => v.raw_status === "En espera por aprobación",
      ).length,
      descanso: volunteers.filter(
        (v) => v.raw_status === "En espera (Descanso)",
      ).length,
      rechazados: volunteers.filter(
        (v) =>
          v.raw_status.includes("Rechazado") ||
          v.raw_status.includes("No elegible"),
      ).length,
    };
  }, [volunteers]);

  // Filtramos la data para la tabla
  const filteredData = useMemo(() => {
    switch (activeTab) {
      case "aptos":
        return volunteers.filter((v) => v.raw_status === "Apto");
      case "en_estudio":
        return volunteers.filter((v) => v.raw_status === "En estudio");
      case "asignado":
        return volunteers.filter((v) => v.raw_status === "Estudio asignado");
      case "por_aprobacion":
        return volunteers.filter(
          (v) => v.raw_status === "En espera por aprobación",
        );
      case "descanso":
        return volunteers.filter(
          (v) => v.raw_status === "En espera (Descanso)",
        );
      case "rechazados":
        return volunteers.filter(
          (v) =>
            v.raw_status.includes("Rechazado") ||
            v.raw_status.includes("No elegible"),
        );
      default:
        return volunteers;
    }
  }, [volunteers, activeTab]);

  const getTableTitle = () => {
    const titles = {
      todos: "Base de Datos Completa",
      aptos: "Voluntarios Aptos",
      en_estudio: "Participando Actualmente",
      asignado: "Programados para Ingreso",
      por_aprobacion: "Solicitudes Pendientes",
      descanso: "Periodo de Lavado (Descanso)",
      rechazados: "Voluntarios No Aptos / Rechazados",
    };
    return titles[activeTab] || "Voluntarios";
  };

  // --- 3. MANEJADORES ---
  const handleCreate = () => {
    setSelectedVolunteerId(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  };
  const handleEdit = (id) => {
    setSelectedVolunteerId(id);
    setIsViewMode(false);
    setIsModalOpen(true);
  };
  const handleView = (id) => {
    setSelectedVolunteerId(id);
    setIsViewMode(true);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVolunteerId(null);
  };
  const handleSuccess = () => {
    handleCloseModal();
    fetchVolunteers(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true); // Bloqueamos UI momentáneamente

    try {
      const res = await api.post("volunteers/import/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Guardamos resultados y abrimos el modal de reporte
      setImportResults(res.data);
      setIsImportModalOpen(true);

      fetchVolunteers(false); // Refrescamos la tabla de fondo
    } catch (error) {
      console.error(error);
      alert(
        "Error crítico al subir archivo: " +
          (error.response?.data?.error || error.message),
      );
    } finally {
      setLoading(false);
      e.target.value = null; // Reset input
    }
  };

  // --- 4. COLUMNAS ---
  const studyOptions = useMemo(() => {
    const options = new Set();
    volunteers.forEach((v) =>
      v.study_names_filter?.forEach((name) => options.add(name)),
    );
    return Array.from(options).sort();
  }, [volunteers]);

  const columns = [
    {
      key: "code",
      label: "Código",
      width: "150px",
      sortable: true,
      customSort: (a, b) => {
        if (a.code_year_filter !== b.code_year_filter)
          return b.code_year_filter.localeCompare(a.code_year_filter);
        return a.code_number_sort - b.code_number_sort;
      },
      render: (row) => (
        <span className="font-mono font-bold text-blue-700">
          {row.code || "---"}
        </span>
      ),
    },
    {
      key: "full_name_search",
      label: "Nombre Completo",
      width: "180px",
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.full_name_search}
          </div>
          <div className="text-xs text-gray-400">{row.email || ""}</div>
        </div>
      ),
    },
    {
      key: "history",
      label: "Historial Estudios",
      width: "160px",
      filterKey: "study_names_filter",
      filterOptions: studyOptions,
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.participations && row.participations.length > 0 ? (
            row.participations.map((p, index) => (
              <span
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200 truncate max-w-[100px]"
              >
                {p.study_name}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs italic">Sin historial</span>
          )}
        </div>
      ),
    },
    {
      key: "active_study",
      label: "Estudio Actual",
      width: "100px",
      render: (row) =>
        row.active_study ? (
          <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-md font-semibold border border-indigo-100 block truncate">
            {row.active_study}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">-</span>
        ),
    },
    {
      key: "last_study",
      label: "Último Estudio",
      width: "150px",
      defaultHidden: true,
      render: (row) => (
        <span className="text-gray-600 text-sm italic">{row.last_study}</span>
      ),
    },
    { key: "age", label: "Edad", width: "70px", sortable: true },
    {
      key: "sex",
      label: "Sexo",
      width: "70px",
      filterKey: "sex",
      defaultHidden: true,
      filterOptions: ["M", "F"],
    },

    {
      key: "creation_date_fmt",
      label: "F. Registro",
      width: "110px",
      defaultHidden: true,
      sortable: true,
      render: (row) => row.creation_date_fmt,
    },
    { key: "curp", label: "CURP", width: "180px" },
    { key: "phone", label: "Teléfono", width: "120px" },
    {
      key: "status",
      label: "Estatus",
      width: "140px",
      filterKey: "status",
      filterOptions: [
        "Apto",
        "En estudio",
        "Estudio asignado",
        "En espera por aprobación",
        "En espera (Descanso)",
        "Rechazado",
      ],
      render: (row) => {
        const s = row.status || "";
        let style = "bg-gray-100 text-gray-600 border-gray-200"; // Default

        if (s === "Apto") style = "bg-green-50 text-green-700 border-green-200";
        else if (s === "En estudio")
          style = "bg-indigo-50 text-indigo-700 border-indigo-200";
        else if (s === "Estudio asignado")
          style = "bg-violet-50 text-violet-700 border-violet-200";
        else if (s === "En espera por aprobación")
          style = "bg-orange-50 text-orange-700 border-orange-200";
        else if (s === "En espera (Descanso)")
          style = "bg-teal-50 text-teal-700 border-teal-200";
        else if (s.includes("Rechazado") || s.includes("No elegible"))
          style = "bg-red-50 text-red-700 border-red-200";

        return (
          <span
            className={`px-2 py-1 rounded-full text-[11px] font-bold border ${style} block text-center truncate`}
          >
            {s}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Acciones",
      width: "110px",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => handleView(row.id)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Ver Detalles"
          >
            <Eye size={16} />
          </button>
          {user?.isAdmin && (
            <button
              onClick={() => handleEdit(row.id)}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
              title="Editar"
            >
              <Edit size={16} />
            </button>
          )}
          <button
            onClick={() => setShowHistoryFor(row)}
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
            title="Historial Rápido"
          >
            <FlaskConical size={16} />
          </button>
        </div>
      ),
    },
  ];

  // --- COMPONENTE TAB PERSONALIZADO ---
  const FilterTab = ({ id, label, icon: Icon, color, count }) => {
    const isActive = activeTab === id;

    // Diccionario de colores
    const activeClasses = {
      blue: "border-blue-600 text-blue-700 bg-blue-50",
      green: "border-green-600 text-green-700 bg-green-50",
      indigo: "border-indigo-600 text-indigo-700 bg-indigo-50",
      violet: "border-violet-600 text-violet-700 bg-violet-50",
      orange: "border-orange-500 text-orange-700 bg-orange-50",
      teal: "border-teal-600 text-teal-700 bg-teal-50",
      red: "border-red-600 text-red-700 bg-red-50", // Color para Rechazados
    };

    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`
          flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all min-w-max outline-none focus:outline-none
          ${
            isActive
              ? activeClasses[color] || "border-gray-800 text-gray-900"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }
        `}
      >
        <Icon size={16} className={isActive ? "stroke-[2.5px]" : ""} />
        {label}
        <span
          className={`ml-1 text-[10px] px-2 py-0.5 rounded-full ${isActive ? "bg-white shadow-sm border border-gray-100" : "bg-gray-100 text-gray-500"}`}
        >
          {count}
        </span>
      </button>
    );
  };

  if (loading && !volunteers.length) {
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-500">Cargando directorio...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">
      {/* 1. HEADER DASHBOARD */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/30 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              Directorio de Voluntarios
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestiona los estados clínicos y administrativos.
            </p>
          </div>

          {/* STATS RÁPIDOS */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 leading-none">
                {counts.todos}
              </div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                Total
              </div>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600 leading-none">
                {counts.aptos}
              </div>
              <div className="text-[10px] font-bold text-green-600/60 uppercase tracking-wider mt-1">
                Aptos
              </div>
            </div>
          </div>
        </div>

        {/* 2. PESTAÑAS DIVIDIDAS Y COLOREADAS */}
        <div className="flex overflow-x-auto px-2 scrollbar-hide">
          <FilterTab
            id="todos"
            label="Todos"
            icon={Users}
            count={counts.todos}
            color="blue"
          />
          <FilterTab
            id="aptos"
            label="Aptos"
            icon={UserCheck}
            count={counts.aptos}
            color="green"
          />
          <FilterTab
            id="en_estudio"
            label="En Estudio"
            icon={FlaskConical}
            count={counts.en_estudio}
            color="indigo"
          />
          <FilterTab
            id="asignado"
            label="Asignado"
            icon={CalendarClock}
            count={counts.asignado}
            color="violet"
          />
          <FilterTab
            id="por_aprobacion"
            label="Por Aprobar"
            icon={ClipboardList}
            count={counts.por_aprobacion}
            color="orange"
          />
          <FilterTab
            id="descanso"
            label="Descanso"
            icon={Hourglass}
            count={counts.descanso}
            color="teal"
          />
          <FilterTab
            id="rechazados"
            label="Rechazados"
            icon={Ban}
            count={counts.rechazados}
            color="red"
          />
        </div>
      </div>

      {/* 3. TABLA PRINCIPAL */}
      <div className="flex-1">
        <SmartTable
          title={getTableTitle()}
          data={filteredData}
          columns={columns}
          actions={
            user?.isAdmin && (
              <div className="flex gap-3">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  id="excel-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() =>
                    document.getElementById("excel-upload").click()
                  }
                  className="flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-all text-sm font-medium shadow-sm"
                >
                  <FileSpreadsheet size={16} />
                  <span className="hidden sm:inline">Importar Excel</span>
                </button>
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold shadow-md shadow-blue-600/20 active:scale-95"
                >
                  <Plus size={18} />
                  <span>Nuevo Voluntario</span>
                </button>
              </div>
            )
          }
        />
      </div>

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Resultados de Importación"
      >
        <div className="p-6">
          {importResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
                <CheckCircle className="shrink-0" size={24} />
                <div>
                  <h4 className="font-bold">Proceso Finalizado</h4>
                  <p className="text-sm">
                    Se han registrado exitosamente{" "}
                    <span className="font-bold text-lg">
                      {importResults.created}
                    </span>{" "}
                    voluntarios nuevos.
                  </p>
                </div>
              </div>

              {importResults.has_errors ? (
                <div>
                  <div className="flex items-center gap-2 text-red-600 font-bold mb-2 mt-4">
                    <AlertTriangle size={20} />
                    <span>
                      Registros no importados ({importResults.errors.length})
                    </span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto text-sm text-red-800 font-mono shadow-inner">
                    <ul className="list-disc pl-4 space-y-1">
                      {importResults.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-right">
                    * Corrige estos errores en tu archivo Excel e intenta
                    importar nuevamente solo estas filas.
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-500 text-sm italic py-4">
                  ¡Excelente! No se encontraron errores en el archivo.
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 font-medium"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
      {/* MODALES (IGUAL QUE ANTES) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-auto relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50 rounded-t-xl shrink-0">
              <h3 className="text-lg font-bold text-gray-800">
                {selectedVolunteerId
                  ? isViewMode
                    ? "Detalle de Voluntario"
                    : "Editar Voluntario"
                  : "Registrar Nuevo Voluntario"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <VolunteerForm
                idToEdit={selectedVolunteerId}
                onClose={handleCloseModal}
                onSuccess={handleSuccess}
                readOnlyMode={isViewMode}
                onParticipationChange={() => fetchVolunteers(false)}
              />
            </div>
          </div>
        </div>
      )}

      {showHistoryFor && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[1px]"
          onClick={() => setShowHistoryFor(null)}
        >
          <div
            className="w-full max-w-lg bg-white h-full shadow-2xl animate-slide-in-right flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">
                  {showHistoryFor.full_name_search}
                </h3>
                <span className="text-xs text-gray-500 font-mono">
                  {showHistoryFor.code}
                </span>
              </div>
              <button onClick={() => setShowHistoryFor(null)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <ParticipationManager
                volunteerId={showHistoryFor.id}
                participations={showHistoryFor.participations}
                readOnly={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerList;
