import { useEffect, useState, useContext, useMemo } from "react";
import api from "../api/axios";
import { Edit, Plus, Eye } from "lucide-react";
import SmartTable from "../components/SmartTable";
import { AuthContext } from "../context/AuthContext";
import Modal from "../components/Modal";
import VolunteerForm from "./VolunteerForm";

const VolunteerList = () => {
  const { user } = useContext(AuthContext);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS PARA EL MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const fetchVolunteers = async () => {
    if (!isModalOpen) setLoading(true);

    try {
      const res = await api.get("volunteers/");
      const processedData = res.data.map((v) => ({
        ...v,
        full_name_search:
          `${v.first_name} ${v.middle_name || ""} ${v.last_name_paternal} ${v.last_name_maternal}`.trim(),
        study_names_filter: v.participations?.map((p) => p.study_name) || [],
        status_filter: v.status,

        // RECUPERADO: Fecha de registro formateada
        creation_date_fmt: new Date(v.created_at).toLocaleDateString(),
        // Auxiliares para filtrado por año
        creation_year_filter: new Date(v.created_at).getFullYear().toString(),
        code_year_filter: v.code.split("-")[1] || "",
        code_number_sort: parseInt(v.code.split("-")[2] || 0),
      }));
      setVolunteers(processedData);
    } catch (error) {
      console.error("Error cargando voluntarios", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteers();
  }, []);

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
    fetchVolunteers();
    alert("Operación realizada con éxito");
  };

  const studyOptions = useMemo(() => {
    const options = new Set();
    volunteers.forEach((v) =>
      v.study_names_filter?.forEach((name) => options.add(name)),
    );
    return Array.from(options).sort();
  }, [volunteers]);

  const yearOptions = useMemo(() => {
    const options = new Set();
    volunteers.forEach((v) => {
      if (v.creation_year_filter) options.add(v.creation_year_filter);
      if (v.code_year_filter) options.add(v.code_year_filter);
    });
    return Array.from(options).sort().reverse();
  }, [volunteers]);

  const statusOptions = [
    "En espera por aprobación",
    "Apto",
    "Rechazado",
    "No elegible por edad",
    "En estudio",
    "Estudio asignado",
    "En espera (Descanso)",
  ];

  // COLUMNAS CON ANCHOS OPTIMIZADOS PARA EVITAR SCROLL
  const columns = [
    {
      key: "code",
      label: "Código",
      width: "130px", // Reducido
      sortable: true,
      filterKey: "code_year_filter",
      filterOptions: yearOptions,
      customSort: (a, b) => {
        if (a.code_year_filter !== b.code_year_filter)
          return b.code_year_filter.localeCompare(a.code_year_filter);
        return a.code_number_sort - b.code_number_sort;
      },
      render: (row) => (
        <span className="font-mono font-bold text-primary">{row.code}</span>
      ),
    },
    {
      key: "full_name_search",
      label: "Nombre Completo",
      width: "220px", // Reducido de 250
      sortable: true,
    },
    {
      key: "history",
      label: "Historial Estudios",
      width: "220px", // Reducido de 300, se ajustará el wrap
      filterKey: "study_names_filter",
      filterOptions: studyOptions,
      defaultHidden: true, // Oculto por defecto
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
      width: "150px", // Reducido
      render: (row) =>
        row.active_study ? (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold">
            {row.active_study}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        ),
    },
    {
      key: "last_study",
      label: "Último Estudio",
      width: "150px",

      render: (row) => (
        <span className="text-gray-600 text-sm italic">{row.last_study}</span>
      ),
    },
    {
      key: "creation_date_fmt",
      label: "F. Registro",
      width: "110px",
      defaultHidden: true, // Oculto por defecto
      sortable: true,
      render: (row) => row.creation_date_fmt,
    },
    {
      key: "age",
      label: "Edad",
      width: "70px",
      sortable: true,
      render: (row) => (
        <span className="text-gray-700 text-sm">{row.age || "-"}</span>
      ),
    },
    { key: "curp", label: "CURP", width: "170px" },
    { key: "phone", label: "Teléfono", width: "110px" },
    {
      key: "status_filter",
      label: "Estatus",
      width: "140px", // Reducido
      filterKey: "status_filter",
      filterOptions: statusOptions,
      render: (row) => {
        const colors = {
          Apto: "bg-green-100 text-green-800 border-green-200",
          "En espera por aprobación":
            "bg-gray-100 text-gray-800 border-gray-200",
          "En espera (Descanso)":
            "bg-orange-100 text-orange-800 border-orange-200",
          "En estudio": "bg-blue-100 text-blue-800 border-blue-200",
          "Estudio asignado": "bg-indigo-100 text-indigo-800 border-indigo-200",
          Rechazado: "bg-red-100 text-red-800 border-red-200",
          "No elegible por edad": "bg-gray-200 text-gray-600 border-gray-300",
        };
        return (
          <span
            className={`font-bold text-xs px-2 py-1 rounded-full border truncate block text-center ${colors[row.status] || "bg-gray-100 text-gray-800"}`}
            title={row.status}
          >
            {row.status}
          </span>
        );
      },
    },
    {
      key: "actions",
      label: "Acciones",
      width: "90px",
      render: (row) => (
        <div className="flex items-center space-x-2 justify-center">
          <button
            onClick={() => handleView(row.id)}
            className="text-gray-500 hover:text-blue-600 transition-colors"
            title="Ver Detalles"
          >
            <Eye size={18} />
          </button>
          {user?.isAdmin && (
            <button
              onClick={() => handleEdit(row.id)}
              className="text-gray-500 hover:text-primary transition-colors"
              title="Editar"
            >
              <Edit size={18} />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading && !isModalOpen)
    return (
      <div className="p-8 text-center text-gray-500">
        Cargando directorio...
      </div>
    );

  return (
    <>
      <SmartTable
        title="Directorio de Voluntarios"
        data={volunteers}
        columns={columns}
        actions={
          user?.isAdmin ? (
            <button
              onClick={handleCreate}
              className="bg-primary text-white px-4 py-2 rounded flex items-center hover:bg-blue-800 transition-colors"
            >
              <Plus size={18} className="mr-2" /> Nuevo
            </button>
          ) : null
        }
      />
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8 relative">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50 rounded-t-lg">
              <h3 className="text-lg font-bold text-gray-800">
                {selectedVolunteerId
                  ? isViewMode
                    ? "Detalles del Voluntario"
                    : "Editar Voluntario"
                  : "Registrar Nuevo Voluntario"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 max-h-[85vh] overflow-y-auto">
              <VolunteerForm
                idToEdit={selectedVolunteerId}
                onClose={handleCloseModal}
                onSuccess={handleSuccess}
                readOnlyMode={isViewMode}
                onParticipationChange={fetchVolunteers}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VolunteerList;
