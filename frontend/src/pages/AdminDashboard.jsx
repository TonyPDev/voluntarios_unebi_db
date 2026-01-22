import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import SmartTable from "../components/SmartTable";
import Modal from "../components/Modal";
import { Shield, BookOpen, Users, Plus, Edit } from "lucide-react";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("studies");
  const [studies, setStudies] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingStudy, setEditingStudy] = useState(null);

  const {
    register: registerStudy,
    handleSubmit: handleStudySubmit,
    reset: resetStudy,
    setValue: setStudyValue,
  } = useForm();
  const {
    register: registerUser,
    handleSubmit: handleUserSubmit,
    reset: resetUser,
  } = useForm();

  // Mapas de Traducción para el Buscador y Tabla
  const actionMap = {
    CREATE: "Creación",
    UPDATE: "Edición",
    DELETE: "Eliminación",
  };
  const modelMap = {
    Volunteer: "Voluntario",
    Study: "Estudio",
    Participation: "Participación",
    User: "Usuario",
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "studies") {
        const res = await api.get("studies/");
        setStudies(res.data);
      } else if (activeTab === "users") {
        const res = await api.get("admin/users/");
        setUsers(res.data);
      } else if (activeTab === "logs") {
        const res = await api.get("admin/logs/");
        const processedLogs = res.data.map((log) => ({
          ...log,
          action_display: actionMap[log.action] || log.action,
          model_display: modelMap[log.model_affected] || log.model_affected,
          date_display: new Date(log.timestamp).toLocaleString(),
        }));
        setLogs(processedLogs);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const openCreateStudy = () => {
    setEditingStudy(null);
    resetStudy();
    setIsStudyModalOpen(true);
  };
  const openEditStudy = (study) => {
    setEditingStudy(study);
    setStudyValue("name", study.name);
    setStudyValue("description", study.description);
    setStudyValue("admission_date", study.admission_date);
    setStudyValue("payment_date", study.payment_date);
    setStudyValue("is_active", study.is_active);
    setIsStudyModalOpen(true);
  };

  const onSaveStudy = async (data) => {
    const payload = { ...data };
    if (!payload.payment_date) payload.payment_date = null;
    if (!payload.admission_date) payload.admission_date = null;

    // --- VALIDACIÓN DE FECHAS (NUEVO) ---
    if (payload.payment_date && payload.admission_date) {
      const admission = new Date(payload.admission_date);
      const payment = new Date(payload.payment_date);
      if (payment <= admission) {
        alert(
          "Error: La fecha de pago debe ser posterior a la fecha de internamiento.",
        );
        return; // Detenemos el guardado
      }
    }

    try {
      if (editingStudy) {
        await api.put(`studies/${editingStudy.id}/`, payload);
        alert("Estudio actualizado");
      } else {
        delete payload.justification;
        await api.post("studies/", payload);
        alert("Estudio creado");
      }
      setIsStudyModalOpen(false);
      resetStudy();
      loadData();
    } catch (error) {
      alert("Error: " + JSON.stringify(error.response?.data || error.message));
    }
  };

  const onCreateUser = async (data) => {
    try {
      await api.post("admin/users/", data);
      setIsUserModalOpen(false);
      resetUser();
      loadData();
      alert("Usuario creado");
    } catch (error) {
      alert("Error: " + JSON.stringify(error.response?.data || error.message));
    }
  };

  // --- FORMATO DE CAMBIOS CORREGIDO (Español + Colores) ---
  const formatChanges = (changes) => {
    if (!changes || Object.keys(changes).length === 0)
      return <span className="text-gray-400">Sin detalles</span>;

    // Diccionario completo de campos
    const fieldMap = {
      first_name: "Nombre",
      middle_name: "Segundo Nombre",
      last_name_paternal: "Apellido Paterno",
      last_name_maternal: "Apellido Materno",
      phone: "Teléfono",
      sex: "Sexo",
      curp: "CURP",
      study: "Estudio",
      admission_date: "F. Internamiento",
      payment_date: "F. Pago",
      is_active: "Vigente",
      name: "Nombre Estudio",
      description: "Descripción",
      username: "Usuario",
      email: "Correo",
      is_staff: "Es Admin",
      volunteer: "Voluntario",
      justification: "Justificación",
    };

    const translateValue = (val) => {
      if (val === true) return "Sí";
      if (val === false) return "No";
      if (val === null || val === "") return "Vacío";
      return String(val);
    };

    return (
      <div className="space-y-1">
        {Object.entries(changes).map(([key, val], idx) => {
          // Traducción del campo o uso del original si no está en el mapa
          const fieldName = fieldMap[key] || key;

          if (val && typeof val === "object" && "to" in val) {
            return (
              <div key={idx} className="text-xs flex items-center gap-1.5">
                <span className="font-bold text-gray-700">{fieldName}:</span>
                {/* COLOR ROJO PARA EL VALOR ANTERIOR */}
                <span className="text-red-600 bg-red-50 px-1 rounded line-through decoration-red-400">
                  {translateValue(val.from)}
                </span>
                <span className="text-gray-400">➔</span>
                {/* COLOR VERDE PARA EL VALOR NUEVO */}
                <span className="text-green-700 bg-green-50 px-1 rounded font-medium">
                  {translateValue(val.to)}
                </span>
              </div>
            );
          }
          // Creación o valor simple
          return (
            <div key={idx} className="text-xs">
              <span className="font-bold text-gray-700">{fieldName}:</span>{" "}
              {translateValue(val)}
            </div>
          );
        })}
      </div>
    );
  };

  const logCols = [
    { key: "date_display", label: "Fecha" },
    { key: "user_name", label: "Usuario" },
    {
      key: "action_display",
      label: "Acción",
      render: (r) => {
        const colors = {
          Creación: "text-green-600",
          Edición: "text-blue-600",
          Eliminación: "text-red-600",
        };
        return (
          <span
            className={`font-bold text-xs uppercase ${colors[r.action_display]}`}
          >
            {r.action_display}
          </span>
        );
      },
    },
    { key: "model_display", label: "Módulo" },
    {
      key: "justification",
      label: "Justificación",
      render: (r) => (
        <span className="italic text-gray-600 text-sm">
          "{r.justification}"
        </span>
      ),
    },
    {
      key: "changes",
      label: "Cambios",
      render: (r) => formatChanges(r.changes),
    },
  ];

  const studyCols = [
    { key: "name", label: "Nombre" },
    {
      key: "admission_date",
      label: "F. Internamiento",
      render: (r) => r.admission_date || "-",
    },
    {
      key: "payment_date",
      label: "F. Pago",
      render: (r) => r.payment_date || "-",
    },
    {
      key: "is_active",
      label: "Estado",
      render: (r) =>
        r.is_active ? (
          <span className="text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded">
            Vigente
          </span>
        ) : (
          <span className="text-gray-500 font-bold text-xs bg-gray-100 px-2 py-1 rounded">
            Finalizado
          </span>
        ),
    },
    {
      key: "actions",
      label: "Acciones",
      render: (row) => (
        <button
          onClick={() => openEditStudy(row)}
          className="text-blue-600 hover:bg-blue-50 p-1 rounded"
        >
          <Edit size={18} />
        </button>
      ),
    },
  ];

  const userCols = [
    { key: "username", label: "Usuario" },
    { key: "first_name", label: "Nombre" },
    { key: "email", label: "Email" },
    {
      key: "is_staff",
      label: "Rol",
      render: (r) => (r.is_staff ? "Admin" : "Usuario"),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">
        Panel de Administración
      </h1>
      <div className="flex border-b border-gray-200 bg-white rounded-t-lg shadow-sm">
        <button
          onClick={() => setActiveTab("studies")}
          className={`flex-1 px-6 py-4 font-bold ${activeTab === "studies" ? "border-b-2 border-primary text-primary bg-blue-50" : "text-gray-500"}`}
        >
          Estudios
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 px-6 py-4 font-bold ${activeTab === "users" ? "border-b-2 border-primary text-primary bg-blue-50" : "text-gray-500"}`}
        >
          Usuarios Staff
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex-1 px-6 py-4 font-bold ${activeTab === "logs" ? "border-b-2 border-primary text-primary bg-blue-50" : "text-gray-500"}`}
        >
          Auditoría
        </button>
      </div>

      <div className="mt-4">
        {activeTab === "studies" && (
          <SmartTable
            title="Estudios"
            data={studies}
            columns={studyCols}
            actions={
              <button
                onClick={openCreateStudy}
                className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-blue-800 flex items-center"
              >
                <Plus size={16} className="mr-2" /> Nuevo
              </button>
            }
          />
        )}
        {activeTab === "users" && (
          <SmartTable
            title="Usuarios"
            data={users}
            columns={userCols}
            actions={
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-blue-800 flex items-center"
              >
                <Plus size={16} className="mr-2" /> Nuevo
              </button>
            }
          />
        )}
        {activeTab === "logs" && (
          <SmartTable title="Bitácora" data={logs} columns={logCols} />
        )}
      </div>

      <Modal
        isOpen={isStudyModalOpen}
        onClose={() => setIsStudyModalOpen(false)}
        title={editingStudy ? "Editar Estudio" : "Crear Estudio"}
      >
        <form onSubmit={handleStudySubmit(onSaveStudy)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Nombre</label>
            <input
              {...registerStudy("name", { required: true })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Descripción</label>
            <textarea
              {...registerStudy("description")}
              className="w-full p-2 border rounded"
              rows="2"
            ></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">
                F. Internamiento
              </label>
              <input
                type="date"
                {...registerStudy("admission_date")}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">F. Pago</label>
              <input
                type="date"
                {...registerStudy("payment_date")}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <div className="flex items-center bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              {...registerStudy("is_active")}
              className="mr-2 h-4 w-4"
            />
            <label className="text-sm font-medium">Estudio Vigente</label>
          </div>
          {editingStudy && (
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
              <label className="block text-sm font-bold text-yellow-800 mb-1">
                Justificación (Obligatorio)
              </label>
              <input
                {...registerStudy("justification", { required: true })}
                className="w-full p-2 border border-yellow-300 rounded"
              />
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded font-bold"
          >
            Guardar
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Crear Usuario"
      >
        <form onSubmit={handleUserSubmit(onCreateUser)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Nombre</label>
              <input
                {...registerUser("first_name", { required: true })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Apellido</label>
              <input
                {...registerUser("last_name", { required: true })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Usuario</label>
            <input
              {...registerUser("username", { required: true })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              {...registerUser("email", { required: true })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              {...registerUser("password", { required: true })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex items-center bg-gray-50 p-3 rounded">
            <input
              type="checkbox"
              {...registerUser("is_staff")}
              className="mr-2"
            />
            <label className="text-sm font-medium">Es Administrador</label>
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded font-bold"
          >
            Crear
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
