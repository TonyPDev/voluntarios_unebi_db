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
    // Si el modal está abierto (estamos editando), no ponemos loading a true
    // para evitar que la tabla de fondo parpadee o desaparezca.
    if (!isModalOpen) setLoading(true);

    try {
      const res = await api.get("volunteers/");
      const processedData = res.data.map((v) => ({
        ...v,
        full_name_search:
          `${v.first_name} ${v.middle_name || ""} ${v.last_name_paternal} ${v.last_name_maternal}`.trim(),
        study_names_filter: v.participations?.map((p) => p.study_name) || [],
        status_filter: v.is_eligible ? "Apto" : "En espera",
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
    volunteers.forEach((v) => {
      v.study_names_filter?.forEach((name) => options.add(name));
    });
    return Array.from(options).sort();
  }, [volunteers]);

  const columns = [
    {
      key: "code",
      label: "Código",
      render: (row) => (
        <span className="font-mono font-bold text-primary">{row.code}</span>
      ),
    },
    {
      key: "full_name",
      label: "Nombre Completo",
      render: (row) =>
        `${row.first_name} ${row.last_name_paternal} ${row.last_name_maternal}`,
    },
    {
      key: "history",
      label: "Historial Estudios",
      filterKey: "study_names_filter",
      filterOptions: studyOptions,
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {row.participations && row.participations.length > 0 ? (
            row.participations.map((p, index) => (
              <span
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200"
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
    { key: "curp", label: "CURP" },
    { key: "phone", label: "Teléfono" },
    {
      key: "status_filter",
      label: "Estatus",
      filterKey: "status_filter",
      filterOptions: ["Apto", "En espera"],
      render: (row) =>
        row.is_eligible ? (
          <span className="text-green-600 font-bold text-sm bg-green-50 px-2 py-1 rounded-full border border-green-200">
            Apto
          </span>
        ) : (
          <span className="text-red-500 font-bold text-sm bg-red-50 px-2 py-1 rounded-full border border-red-200">
            En espera
          </span>
        ),
    },
    {
      key: "actions",
      label: "Acciones",
      render: (row) => (
        <div className="flex items-center space-x-2">
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
              <Plus size={18} className="mr-2" />
              Nuevo
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
                // NUEVO: Pasamos la función para refrescar la lista de fondo
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
