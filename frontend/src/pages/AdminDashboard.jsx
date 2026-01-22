import { useState, useEffect } from "react";
import { useForm } from "react-hook-form"; // Necesario para los formularios nuevos
import api from "../api/axios";
import SmartTable from "../components/SmartTable";
import Modal from "../components/Modal"; // Importamos el modal que acabamos de crear
import { Shield, BookOpen, Users, Plus } from "lucide-react";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("studies");
  const [studies, setStudies] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados para Modales
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Formularios independientes
  const {
    register: registerStudy,
    handleSubmit: handleStudySubmit,
    reset: resetStudy,
  } = useForm();
  const {
    register: registerUser,
    handleSubmit: handleUserSubmit,
    reset: resetUser,
  } = useForm();

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
        setLogs(res.data);
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

  // --- ACCIONES DE CREACIÓN ---

  const onCreateStudy = async (data) => {
    try {
      await api.post("studies/", data);
      setIsStudyModalOpen(false);
      resetStudy();
      loadData(); // Recargar tabla
      alert("Estudio creado exitosamente");
    } catch (error) {
      alert(
        "Error al crear estudio: " +
          JSON.stringify(error.response?.data || error.message),
      );
    }
  };

  const onCreateUser = async (data) => {
    try {
      await api.post("admin/users/", data);
      setIsUserModalOpen(false);
      resetUser();
      loadData(); // Recargar tabla
      alert("Usuario creado exitosamente");
    } catch (error) {
      alert(
        "Error al crear usuario: " +
          JSON.stringify(error.response?.data || error.message),
      );
    }
  };

  // --- COLUMNAS ---

  const studyCols = [
    { key: "name", label: "Nombre Estudio" },
    {
      key: "is_active",
      label: "Estado",
      render: (r) =>
        r.is_active ? (
          <span className="text-green-600 font-bold text-sm bg-green-100 px-2 py-1 rounded">
            Vigente
          </span>
        ) : (
          <span className="text-gray-500 font-bold text-sm bg-gray-100 px-2 py-1 rounded">
            Finalizado
          </span>
        ),
    },
  ];

  const userCols = [
    { key: "username", label: "Usuario" },
    { key: "email", label: "Email" },
    {
      key: "is_staff",
      label: "Rol",
      render: (r) =>
        r.is_staff ? (
          <span className="text-blue-600 font-bold">Administrador</span>
        ) : (
          <span>Usuario Normal</span>
        ),
    },
  ];

  const logCols = [
    {
      key: "timestamp",
      label: "Fecha/Hora",
      render: (r) => new Date(r.timestamp).toLocaleString(),
    },
    { key: "user_name", label: "Usuario" },
    {
      key: "action",
      label: "Acción",
      render: (r) => (
        <span
          className={`font-bold ${r.action === "DELETE" ? "text-red-600" : "text-blue-600"}`}
        >
          {r.action}
        </span>
      ),
    },
    { key: "model_affected", label: "Módulo" },
    {
      key: "justification",
      label: "Justificación",
      render: (r) => (
        <span className="italic text-gray-600">"{r.justification}"</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">
        Panel de Administración
      </h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-lg shadow-sm">
        <button
          onClick={() => setActiveTab("studies")}
          className={`flex-1 px-6 py-4 flex items-center justify-center ${activeTab === "studies" ? "border-b-2 border-primary text-primary font-bold" : "text-gray-500"}`}
        >
          <BookOpen size={18} className="mr-2" /> Estudios
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 px-6 py-4 flex items-center justify-center ${activeTab === "users" ? "border-b-2 border-primary text-primary font-bold" : "text-gray-500"}`}
        >
          <Users size={18} className="mr-2" /> Usuarios Staff
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex-1 px-6 py-4 flex items-center justify-center ${activeTab === "logs" ? "border-b-2 border-primary text-primary font-bold" : "text-gray-500"}`}
        >
          <Shield size={18} className="mr-2" /> Auditoría
        </button>
      </div>

      {/* Contenido */}
      <div className="mt-4">
        {activeTab === "studies" && (
          <SmartTable
            title="Gestión de Estudios"
            data={studies}
            columns={studyCols}
            actions={
              <button
                onClick={() => setIsStudyModalOpen(true)}
                className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-blue-800 flex items-center"
              >
                <Plus size={16} className="mr-2" /> Nuevo Estudio
              </button>
            }
          />
        )}

        {activeTab === "users" && (
          <SmartTable
            title="Gestión de Usuarios del Sistema"
            data={users}
            columns={userCols}
            actions={
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-blue-800 flex items-center"
              >
                <Plus size={16} className="mr-2" /> Nuevo Usuario
              </button>
            }
          />
        )}

        {activeTab === "logs" && (
          <SmartTable
            title="Bitácora de Cambios"
            data={logs}
            columns={logCols}
          />
        )}
      </div>

      {/* MODAL CREAR ESTUDIO */}
      <Modal
        isOpen={isStudyModalOpen}
        onClose={() => setIsStudyModalOpen(false)}
        title="Crear Nuevo Estudio"
      >
        <form onSubmit={handleStudySubmit(onCreateStudy)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nombre del Estudio
            </label>
            <input
              {...registerStudy("name", { required: true })}
              className="mt-1 w-full p-2 border rounded"
              placeholder="Ej: Bioequivalencia 2026-A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              {...registerStudy("description")}
              className="mt-1 w-full p-2 border rounded"
              rows="3"
            ></textarea>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              {...registerStudy("is_active")}
              defaultChecked={true}
              className="mr-2"
            />
            <label className="text-sm font-medium text-gray-700">Vigente</label>
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded hover:bg-blue-800 font-bold"
          >
            Guardar Estudio
          </button>
        </form>
      </Modal>

      {/* MODAL CREAR USUARIO */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Crear Nuevo Usuario"
      >
        <form onSubmit={handleUserSubmit(onCreateUser)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nombre de Usuario
            </label>
            <input
              {...registerUser("username", { required: true })}
              className="mt-1 w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Correo Electrónico
            </label>
            <input
              type="email"
              {...registerUser("email", { required: true })}
              className="mt-1 w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              type="password"
              {...registerUser("password", { required: true })}
              className="mt-1 w-full p-2 border rounded"
            />
          </div>
          <div className="flex items-center bg-yellow-50 p-3 rounded border border-yellow-200">
            <input
              type="checkbox"
              {...registerUser("is_staff")}
              className="mr-2 h-4 w-4 text-primary"
            />
            <div>
              <label className="text-sm font-bold text-gray-800">
                ¿Es Administrador?
              </label>
              <p className="text-xs text-gray-500">
                Los administradores pueden crear usuarios y editar estudios.
              </p>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded hover:bg-blue-800 font-bold"
          >
            Crear Usuario
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
