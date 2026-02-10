import { useState, useEffect, useMemo, useContext } from "react";
import AuthContext from "../context/AuthContext";
import api from "../api/axios";

// Componentes
import SmartTable from "../components/SmartTable";
import Modal from "../components/Modal";
import VolunteerForm from "./VolunteerForm";
import ParticipationManager from "../components/ParticipationManager";

// Iconos (Asegúrate de instalarlos: npm install lucide-react)
import {
  Users,
  UserCheck,
  FlaskConical,
  Clock,
  Plus,
  FileSpreadsheet,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react";

const VolunteerList = () => {
  const { user } = useContext(AuthContext);

  // --- Estados ---
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);
  const [showParticipations, setShowParticipations] = useState(null);

  // ESTADO NUEVO: Filtro Rápido (Tabs)
  const [quickFilter, setQuickFilter] = useState("todos");

  // Carga inicial
  useEffect(() => {
    fetchVolunteers();
  }, []);

  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/volunteers/");
      setVolunteers(response.data);
    } catch (error) {
      console.error("Error fetching volunteers:", error);
      alert("Error al cargar voluntarios");
    } finally {
      setLoading(false);
    }
  };

  // --- Lógica de Acciones ---
  const handleCreate = () => {
    setSelectedVolunteer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (volunteer) => {
    setSelectedVolunteer(volunteer);
    setIsModalOpen(true);
  };

  const handleCloseModal = (shouldRefresh) => {
    setIsModalOpen(false);
    setSelectedVolunteer(null);
    if (shouldRefresh) fetchVolunteers();
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este voluntario?")) {
      try {
        await api.delete(`/volunteers/${id}/`);
        fetchVolunteers();
      } catch (error) {
        console.error("Error deleting volunteer:", error);
        alert("Error al eliminar");
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/volunteers/import/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Importación exitosa");
      fetchVolunteers();
    } catch (error) {
      console.error("Import error:", error);
      alert("Error en la importación");
    }
  };

  // --- LÓGICA DE FILTRADO RÁPIDO (TABS) ---
  const filteredVolunteers = useMemo(() => {
    if (quickFilter === "todos") return volunteers;

    return volunteers.filter((v) => {
      const status = v.status || "";
      if (quickFilter === "aptos") return status === "Apto";
      if (quickFilter === "estudio")
        return status.includes("estudio") || status.includes("Estudio");
      if (quickFilter === "pendientes")
        return status.includes("espera") || status.includes("approbación");
      return true;
    });
  }, [volunteers, quickFilter]);

  // Conteos para las pestañas
  const counts = useMemo(
    () => ({
      todos: volunteers.length,
      aptos: volunteers.filter((v) => v.status === "Apto").length,
      estudio: volunteers.filter((v) =>
        (v.status || "").toLowerCase().includes("estudio"),
      ).length,
      pendientes: volunteers.filter((v) =>
        (v.status || "").toLowerCase().includes("espera"),
      ).length,
    }),
    [volunteers],
  );

  // Componente de Pestaña Individual
  const FilterTab = ({ id, label, icon: Icon, colorClass, count }) => (
    <button
      onClick={() => setQuickFilter(id)}
      className={`
        relative flex items-center gap-2 px-5 py-3 transition-all font-medium text-sm border-b-2
        ${
          quickFilter === id
            ? `border-${colorClass} text-${colorClass} bg-${colorClass}/5`
            : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        }
      `}
    >
      <Icon size={16} />
      {label}
      <span
        className={`ml-1 text-xs px-2 py-0.5 rounded-full ${quickFilter === id ? "bg-white shadow-sm border" : "bg-gray-100 text-gray-500"}`}
      >
        {count}
      </span>
    </button>
  );

  // --- Definición de Columnas ---
  const columns = useMemo(
    () => [
      {
        key: "code",
        label: "Código",
        sortable: true,
        width: 120,
        filterKey: "code",
        filterOptions: [],
      },
      {
        key: "full_name",
        label: "Nombre Completo",
        sortable: true,
        width: 250,
        filterKey: "full_name",
        filterOptions: [], // Podrías poblar esto dinámicamente si quisieras
        render: (row) => (
          <div className="font-medium text-gray-900">{row.full_name}</div>
        ),
      },
      {
        key: "age",
        label: "Edad",
        sortable: true,
        width: 80,
        render: (row) => (row.age ? `${row.age} años` : "-"),
      },
      {
        key: "sex",
        label: "Sexo",
        sortable: true,
        width: 80,
        filterKey: "sex",
        filterOptions: ["M", "F"],
      },
      { key: "phone", label: "Teléfono", width: 120 },
      {
        key: "status",
        label: "Estatus",
        sortable: true,
        width: 180,
        filterKey: "status",
        filterOptions: [
          "Apto",
          "No elegible por edad",
          "En espera (Descanso)",
          "En estudio",
          "En espera por aprobación",
        ],
        render: (row) => {
          let color = "bg-gray-100 text-gray-700 border-gray-200";
          const s = row.status || "";

          if (s === "Apto")
            color = "bg-green-50 text-green-700 border-green-200";
          else if (s.includes("No elegible") || s.includes("Rechazado"))
            color = "bg-red-50 text-red-700 border-red-200";
          else if (s.includes("estudio") || s.includes("Estudio"))
            color = "bg-blue-50 text-blue-700 border-blue-200";
          else if (s.includes("espera"))
            color = "bg-orange-50 text-orange-700 border-orange-200";

          return (
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}
            >
              {s}
            </span>
          );
        },
      },
      {
        key: "actions",
        label: "Acciones",
        width: 140,
        render: (row) => (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleEdit(row)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Editar"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => setShowParticipations(row)}
              className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title="Ver Participaciones"
            >
              <FlaskConical size={16} />
            </button>
            {user?.isAdmin && (
              <button
                onClick={() => handleDelete(row.id)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [user],
  );

  if (loading)
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in">
      {/* 1. SECCIÓN DE CABECERA Y FILTROS RÁPIDOS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Directorio de Voluntarios
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestiona, filtra y exporta la información de los participantes
              clínicos.
            </p>
          </div>
          {/* Estadísticas rápidas opcionales */}
          <div className="hidden md:flex gap-4 text-sm text-gray-500">
            <div className="text-right">
              <div className="font-bold text-gray-800 text-lg">
                {counts.todos}
              </div>
              <div className="text-xs uppercase tracking-wide">Total</div>
            </div>
            <div className="w-px bg-gray-200 h-10"></div>
            <div className="text-right">
              <div className="font-bold text-green-600 text-lg">
                {counts.aptos}
              </div>
              <div className="text-xs uppercase tracking-wide">Aptos</div>
            </div>
          </div>
        </div>

        {/* TABS DE NAVEGACIÓN */}
        <div className="flex overflow-x-auto bg-white px-2">
          <FilterTab
            id="todos"
            label="Todos"
            icon={Users}
            colorClass="blue-600"
            count={counts.todos}
          />
          <FilterTab
            id="aptos"
            label="Aptos"
            icon={UserCheck}
            colorClass="green-600"
            count={counts.aptos}
          />
          <FilterTab
            id="estudio"
            label="En Estudio"
            icon={FlaskConical}
            colorClass="indigo-600"
            count={counts.estudio}
          />
          <FilterTab
            id="pendientes"
            label="Pendientes"
            icon={Clock}
            colorClass="orange-500"
            count={counts.pendientes}
          />
        </div>
      </div>

      {/* 2. TABLA INTELIGENTE */}
      <div className="flex-1 min-h-0 shadow-sm rounded-xl overflow-hidden">
        <SmartTable
          title={
            quickFilter === "todos"
              ? "Base de Datos Completa"
              : quickFilter === "aptos"
                ? "Voluntarios Aptos"
                : quickFilter === "estudio"
                  ? "Voluntarios en Estudio Activo"
                  : "Pendientes de Aprobación"
          }
          data={filteredVolunteers}
          columns={columns}
          actions={
            user?.isAdmin ? (
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  id="excel-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* Botón Importar */}
                <button
                  onClick={() =>
                    document.getElementById("excel-upload").click()
                  }
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:text-green-700 hover:border-green-300 transition-all shadow-sm text-sm font-medium"
                >
                  <FileSpreadsheet size={16} className="text-green-600" />
                  <span className="hidden sm:inline">Importar Excel</span>
                </button>

                {/* Botón Nuevo Voluntario (Destacado) */}
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-600/20 transition-all transform active:scale-95 text-sm font-bold"
                >
                  <Plus size={18} />
                  <span>Nuevo Voluntario</span>
                </button>
              </div>
            ) : null
          }
        />
      </div>

      {/* 3. MODALES */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => handleCloseModal(false)}
        title={selectedVolunteer ? "Editar Voluntario" : "Nuevo Voluntario"}
      >
        <VolunteerForm
          volunteerToEdit={selectedVolunteer}
          onSuccess={() => handleCloseModal(true)}
          onCancel={() => handleCloseModal(false)}
        />
      </Modal>

      {/* Modal de Participaciones (Drawer lateral o Modal centrado) */}
      {showParticipations && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl animate-slide-in-right overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold">
                Historial de Estudios: {showParticipations.code}
              </h2>
              <button
                onClick={() => setShowParticipations(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <ParticipationManager volunteerId={showParticipations.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerList;
