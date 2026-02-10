import { useEffect, useState, useContext, useMemo, useCallback } from "react";
import api from "../api/axios";
import { Edit, Plus, Eye, Upload, FileSpreadsheet } from "lucide-react";
import SmartTable from "../components/SmartTable";
import { AuthContext } from "../context/AuthContext";
import VolunteerForm from "./VolunteerForm";

const VolunteerList = () => {
  const { user } = useContext(AuthContext);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS PARA EL MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true); // Bloqueamos pantalla
    try {
      const res = await api.post("volunteers/import/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      let msg = res.data.message;
      if (res.data.errors && res.data.errors.length > 0) {
        msg +=
          "\n\nAdvertencias:\n" +
          res.data.errors.slice(0, 5).join("\n") +
          (res.data.errors.length > 5 ? "\n..." : "");
      }

      alert(msg);
      fetchVolunteers(false); // Recargar lista
    } catch (error) {
      console.error(error);
      alert(
        "Error al importar: " +
          (error.response?.data?.error || "Error desconocido"),
      );
    } finally {
      setLoading(false);
      e.target.value = null; // Limpiar input para poder subir el mismo archivo si es necesario
    }
  };
  // --- FUNCIÓN DE CARGA MODIFICADA PARA AUTO-REFRESCO ---
  // Acepta 'isBackground' para saber si es una actualización silenciosa
  const fetchVolunteers = useCallback(async (isBackground = false) => {
    // Solo mostramos el spinner de carga si NO es segundo plano
    if (!isBackground) setLoading(true);

    try {
      const res = await api.get("volunteers/");
      const processedData = res.data.map((v) => ({
        ...v,
        full_name_search:
          `${v.first_name} ${v.middle_name || ""} ${v.last_name_paternal} ${v.last_name_maternal}`.trim(),
        study_names_filter: v.participations?.map((p) => p.study_name) || [],
        status_filter: v.status,

        creation_date_fmt: new Date(v.created_at).toLocaleDateString(),
        creation_year_filter: new Date(v.created_at).getFullYear().toString(),
        code_year_filter: v.code.split("-")[1] || "",
        code_number_sort: parseInt(v.code.split("-")[2] || 0),
      }));

      // Actualizamos los datos (React detectará si hay cambios y repintará la tabla)
      setVolunteers(processedData);
    } catch (error) {
      console.error("Error cargando voluntarios", error);
    } finally {
      // Solo desactivamos el loading si NO fue en segundo plano
      if (!isBackground) setLoading(false);
    }
  }, []);

  // --- EFECTO PARA EL AUTO-REFRESCO (POLLING) ---
  useEffect(() => {
    // 1. Carga inicial normal (muestra cargando)
    fetchVolunteers(false);

    // 2. Configurar el intervalo para actualizar cada 5 segundos
    const intervalId = setInterval(() => {
      // Llamamos en modo 'background' para que no parpadee la pantalla
      fetchVolunteers(true);
    }, 5000); // 5000 ms = 5 segundos

    // 3. Limpieza: Detener el reloj cuando el usuario salga de esta pantalla
    return () => clearInterval(intervalId);
  }, [fetchVolunteers]);

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

  // Al guardar exitosamente, forzamos una recarga inmediata
  const handleSuccess = () => {
    handleCloseModal();
    fetchVolunteers(false); // Refresco inmediato visual
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

  const columns = [
    {
      key: "code",
      label: "Código",
      width: "130px",
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
      width: "220px",
      sortable: true,
    },
    {
      key: "history",
      label: "Historial Estudios",
      width: "220px",
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
      width: "150px",
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
      defaultHidden: true,
      render: (row) => (
        <span className="text-gray-600 text-sm italic">{row.last_study}</span>
      ),
    },
    {
      key: "creation_date_fmt",
      label: "F. Registro",
      width: "110px",
      defaultHidden: true,
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
      width: "140px",
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
            <div className="flex gap-2">
              {/* INPUT OCULTO */}
              <input
                type="file"
                accept=".xlsx, .xls"
                id="excel-upload"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* BOTÓN DE IMPORTAR */}
              <button
                onClick={() => document.getElementById("excel-upload").click()}
                className="bg-green-600 text-white px-4 py-2 rounded flex items-center hover:bg-green-700 transition-colors"
                title="Importar Excel"
              >
                <FileSpreadsheet size={18} className="mr-2" /> Importar
              </button>

              {/* BOTÓN DE NUEVO (YA EXISTÍA) */}
              <button
                onClick={handleCreate}
                className="bg-primary text-white px-4 py-2 rounded flex items-center hover:bg-blue-800 transition-colors"
              >
                <Plus size={18} className="mr-2" /> Nuevo
              </button>
            </div>
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
                onParticipationChange={() => fetchVolunteers(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VolunteerList;
