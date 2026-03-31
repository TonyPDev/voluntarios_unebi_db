import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import api from "../api/axios";
import SmartTable from "../components/SmartTable";
import Modal from "../components/Modal";
import CustomDatePicker from "../components/CustomDatePicker";
import { Shield, BookOpen, Users, Plus, Edit, Minus } from "lucide-react";

// Componente auxiliar para manejar listas dinámicas (Moléculas y Dosis)
const ArrayInput = ({ label, addLabel, items, setItems, placeholder }) => (
  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
    <label className="block text-sm font-bold text-gray-700 mb-2">
      {label}
    </label>
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 animate-fade-in">
          <input
            type="text"
            value={item}
            onChange={(e) => {
              const newItems = [...items];
              newItems[idx] = e.target.value;
              setItems(newItems);
            }}
            placeholder={placeholder}
            className="w-full p-2 text-sm border rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white"
          />
          <button
            type="button"
            onClick={() => setItems(items.filter((_, i) => i !== idx))}
            className="bg-red-50 text-red-600 p-2 rounded hover:bg-red-100 transition-colors"
            title="Quitar"
          >
            <Minus size={16} />
          </button>
        </div>
      ))}
    </div>
    <button
      type="button"
      onClick={() => setItems([...items, ""])}
      className="mt-3 text-sm text-blue-600 font-bold flex items-center hover:text-blue-800 transition-colors"
    >
      <Plus size={16} className="mr-1" /> {addLabel}
    </button>
  </div>
);

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("studies");
  const [studies, setStudies] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados de Modales
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Estado de Edición de Estudios y Listas Dinámicas
  const [editingStudy, setEditingStudy] = useState(null);
  const [molecules, setMolecules] = useState([]);
  const [doses, setDoses] = useState([]);

  // Formularios
  const {
    register: registerStudy,
    handleSubmit: handleStudySubmit,
    reset: resetStudy,
    setValue: setStudyValue,
    control: controlStudy,
  } = useForm();

  const {
    register: registerUser,
    handleSubmit: handleUserSubmit,
    reset: resetUser,
  } = useForm();

  // Carga de Datos
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "studies") {
        const res = await api.get("studies/");
        // Procesamos datos para los filtros de la tabla
        const processedStudies = res.data.map((s) => ({
          ...s,
          is_active_label: s.is_active ? "Vigente" : "Finalizado",
          sponsor_label: s.sponsor || "Sin Patrocinador",
          molecules_display: (s.molecules || []).join(", "),
          doses_display: (s.doses || []).join(", "),
        }));
        setStudies(processedStudies);
      } else if (activeTab === "users") {
        const res = await api.get("admin/users/");
        setUsers(res.data);
      } else if (activeTab === "logs") {
        const res = await api.get("admin/logs/");
        // Procesar logs para visualización amigable
        const processedLogs = res.data.map((log) => ({
          ...log,
          action_display:
            { CREATE: "Creación", UPDATE: "Edición", DELETE: "Eliminación" }[
              log.action
            ] || log.action,
          model_display:
            {
              Volunteer: "Voluntario",
              Study: "Estudio",
              Participation: "Participación",
              User: "Usuario",
            }[log.model_affected] || log.model_affected,
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

  // Extraer opciones únicas de Patrocinadores para el filtro
  const sponsorOptions = useMemo(() => {
    const opts = new Set(studies.map((s) => s.sponsor_label));
    return Array.from(opts).sort();
  }, [studies]);

  // --- Lógica de Estudios ---

  const openCreateStudy = () => {
    setEditingStudy(null);
    setMolecules([]);
    setDoses([]);
    resetStudy({
      is_active: true, // Por defecto activado
      sponsor: "",
    });
    setIsStudyModalOpen(true);
  };

  const openEditStudy = (study) => {
    setEditingStudy(study);
    setMolecules(study.molecules || []);
    setDoses(study.doses || []);
    setStudyValue("name", study.name);
    setStudyValue("sponsor", study.sponsor || "");
    setStudyValue("description", study.description);
    setStudyValue("admission_date", study.admission_date);
    setStudyValue("payment_date", study.payment_date);
    setStudyValue("is_active", study.is_active);
    setIsStudyModalOpen(true);
  };

  const onSaveStudy = async (data) => {
    const payload = {
      ...data,
      // Limpiamos strings vacíos que el usuario haya dejado
      molecules: molecules.filter((m) => m.trim() !== ""),
      doses: doses.filter((d) => d.trim() !== ""),
    };

    // Limpieza de fechas
    if (!payload.payment_date) payload.payment_date = null;
    if (!payload.admission_date) payload.admission_date = null;

    // Validación de Fechas
    if (payload.payment_date && payload.admission_date) {
      if (new Date(payload.payment_date) <= new Date(payload.admission_date)) {
        alert(
          "Error: La fecha de pago debe ser posterior a la fecha de internamiento.",
        );
        return;
      }
    }

    try {
      if (editingStudy) {
        await api.put(`studies/${editingStudy.id}/`, payload);
        alert("Estudio actualizado");
      } else {
        delete payload.justification; // No necesaria al crear
        await api.post("studies/", payload);
        alert("Estudio creado");
      }
      setIsStudyModalOpen(false);
      resetStudy();
      loadData();
    } catch (error) {
      const msg = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      alert("Error: " + msg);
    }
  };

  // --- Lógica de Usuarios ---

  const onCreateUser = async (data) => {
    try {
      await api.post("admin/users/", data);
      setIsUserModalOpen(false);
      resetUser();
      loadData();
      alert("Usuario creado exitosamente");
    } catch (error) {
      alert("Error: " + JSON.stringify(error.response?.data));
    }
  };

  // --- Configuración de Tablas ---

  const formatChanges = (changes) => {
    if (!changes || Object.keys(changes).length === 0)
      return <span className="text-gray-400">Sin detalles</span>;

    // 1. Diccionario Completo de Campos (Traducción de Keys)
    const fieldMap = {
      // Estudios (Actualizado a Código)
      name: "Código del Estudio",
      sponsor: "Patrocinador",
      molecules: "Moléculas",
      doses: "Dosis",
      description: "Descripción",
      admission_date: "F. Internamiento",
      payment_date: "F. Pago",
      is_active: "Vigente",

      // Voluntarios
      code: "Código",
      first_name: "Primer Nombre",
      middle_name: "Segundo Nombre",
      last_name_paternal: "Apellido Paterno",
      last_name_maternal: "Apellido Materno",
      birth_date: "Fecha de Nacimiento",
      sex: "Sexo",
      phone: "Teléfono",
      curp: "CURP",
      manual_status: "Estatus Administrativo",
      status_reason: "Motivo del Estatus",
      rejection_category: "Categoría de Rechazo",
      contacted: "Contactado",
      initial_study_id: "Estudio Inicial",
      justification: "Justificación",

      // Usuarios
      username: "Usuario",
      email: "Correo Electrónico",
      is_staff: "Es Administrador",
    };

    // 2. Función auxiliar para traducir Valores específicos
    const formatValue = (key, value) => {
      if (value === null || value === undefined || value === "") return "Vacío";

      // Manejo de Arrays (Moléculas y Dosis)
      if (Array.isArray(value)) {
        return value.length > 0 ? value.join(", ") : "Ninguno";
      }
      // Stringificado por si es un JSON en string
      if (
        typeof value === "string" &&
        value.startsWith("[") &&
        value.endsWith("]")
      ) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed.join(", ");
        } catch (e) {}
      }

      // Traducir Estatus Administrativo
      if (key === "manual_status") {
        const statusMap = {
          waiting_approval: "En espera por aprobación",
          eligible: "Apto",
          rejected: "Rechazado",
        };
        return statusMap[value] || value;
      }

      // Traducir Sexo
      if (key === "sex") {
        return value === "M" ? "Masculino" : value === "F" ? "Femenino" : value;
      }

      // Traducir Booleanos (True/False -> Sí/No)
      if (
        key === "is_active" ||
        key === "is_staff" ||
        typeof value === "boolean" ||
        value === "True" ||
        value === "False"
      ) {
        return value === true || value === "True" ? "Sí" : "No";
      }

      return String(value);
    };

    return (
      <div className="space-y-1">
        {Object.entries(changes).map(([key, val], idx) => {
          // Usamos el nombre traducido o la llave original capitalizada si no existe
          const fieldName =
            fieldMap[key] || key.charAt(0).toUpperCase() + key.slice(1);

          if (val && typeof val === "object" && "to" in val) {
            return (
              <div key={idx} className="text-xs">
                <span className="font-bold text-gray-700">{fieldName}:</span>{" "}
                <span className="text-red-500 line-through mr-1 opacity-70">
                  {formatValue(key, val.from)}
                </span>{" "}
                <span className="text-gray-400">➔</span>{" "}
                <span className="text-green-700 font-semibold">
                  {formatValue(key, val.to)}
                </span>
              </div>
            );
          }
          // Caso para logs manuales simples
          return (
            <div key={idx} className="text-xs">
              <span className="font-bold text-gray-700">{fieldName}:</span>{" "}
              <span>{formatValue(key, val)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const studyCols = [
    { key: "name", label: "Código", sortable: true }, // Etiqueta actualizada a "Código"
    {
      key: "sponsor_label",
      label: "Patrocinador",
      sortable: true,
      filterKey: "sponsor_label",
      filterOptions: sponsorOptions,
    },
    {
      key: "molecules_display",
      label: "Moléculas",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.molecules && r.molecules.length > 0 ? (
            r.molecules.map((m, i) => (
              <span
                key={i}
                className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200"
              >
                {m}
              </span>
            ))
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: "doses_display",
      label: "Dosis",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.doses && r.doses.length > 0 ? (
            r.doses.map((d, i) => (
              <span
                key={i}
                className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200"
              >
                {d}
              </span>
            ))
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: "admission_date",
      label: "F. Internamiento",
      sortable: true,
      render: (r) => r.admission_date || "-",
    },
    {
      key: "payment_date",
      label: "F. Pago",
      sortable: true,
      render: (r) => r.payment_date || "-",
    },
    {
      key: "is_active_label",
      label: "Estado",
      filterKey: "is_active_label",
      filterOptions: ["Vigente", "Finalizado"],
      render: (r) =>
        r.is_active ? (
          <span className="text-green-600 font-bold text-[10px] bg-green-100 px-2 py-1 rounded">
            Vigente
          </span>
        ) : (
          <span className="text-gray-500 font-bold text-[10px] bg-gray-100 px-2 py-1 rounded">
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
    { key: "username", label: "Usuario", sortable: true },
    {
      key: "full_name",
      label: "Nombre Completo",
      sortable: true,
      customSort: (a, b) => {
        const nameA = `${a.first_name || ""} ${a.last_name || ""}`
          .trim()
          .toLowerCase();
        const nameB = `${b.first_name || ""} ${b.last_name || ""}`
          .trim()
          .toLowerCase();
        return nameA.localeCompare(nameB);
      },
      render: (r) => {
        const fullName = `${r.first_name || ""} ${r.last_name || ""}`.trim();
        return (
          fullName || <span className="text-gray-400 italic">Sin nombre</span>
        );
      },
    },
    { key: "email", label: "Email", sortable: true },
    {
      key: "is_staff",
      label: "Rol",
      render: (r) => (r.is_staff ? "Admin" : "Usuario"),
    },
  ];

  const logCols = [
    {
      key: "date_display",
      label: "Fecha",
      sortable: true,
      customSort: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    },
    { key: "user_name", label: "Usuario", sortable: true },
    {
      key: "action_display",
      label: "Acción",
      defaultHidden: true,
      render: (r) => (
        <span
          className={
            r.action === "DELETE"
              ? "text-red-600 font-bold"
              : "text-blue-600 font-bold"
          }
        >
          {r.action_display}
        </span>
      ),
    },
    {
      key: "model_display",
      label: "Módulo",
      defaultHidden: true,
      sortable: true,
    },
    {
      key: "justification",
      label: "Justificación",
      render: (r) => (
        <span className="italic text-gray-600 text-xs">
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">
        Panel de Administración
      </h1>

      <div className="flex border-b border-gray-200 bg-white rounded-t-lg shadow-sm">
        <button
          onClick={() => setActiveTab("studies")}
          className={`flex-1 px-6 py-4 font-bold ${activeTab === "studies" ? "border-b-2 border-primary text-primary" : "text-gray-500"}`}
        >
          Estudios
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 px-6 py-4 font-bold ${activeTab === "users" ? "border-b-2 border-primary text-primary" : "text-gray-500"}`}
        >
          Usuarios
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`flex-1 px-6 py-4 font-bold ${activeTab === "logs" ? "border-b-2 border-primary text-primary" : "text-gray-500"}`}
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
                className="bg-primary text-white px-4 py-2 rounded flex items-center"
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
                className="bg-primary text-white px-4 py-2 rounded flex items-center"
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

      {/* Modal Estudios */}
      <Modal
        isOpen={isStudyModalOpen}
        onClose={() => setIsStudyModalOpen(false)}
        title={editingStudy ? "Editar Estudio" : "Crear Estudio"}
      >
        <div className="max-h-[80vh] overflow-y-auto custom-scrollbar p-1">
          <form onSubmit={handleStudySubmit(onSaveStudy)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">
                  Código del Estudio
                </label>
                <input
                  {...registerStudy("name", { required: true })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Patrocinador
                </label>
                <input
                  {...registerStudy("sponsor")}
                  placeholder="Ej. Pfizer, Roche..."
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ArrayInput
                label="Moléculas"
                addLabel="Añadir Molécula"
                items={molecules}
                setItems={setMolecules}
                placeholder="Ej. Paracetamol"
              />
              <ArrayInput
                label="Dosis"
                addLabel="Añadir Dosis"
                items={doses}
                setItems={setDoses}
                placeholder="Ej. 500 mg"
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
                <Controller
                  control={controlStudy}
                  name="admission_date"
                  render={({ field }) => (
                    <CustomDatePicker
                      label="F. Internamiento"
                      selectedDate={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div>
                <Controller
                  control={controlStudy}
                  name="payment_date"
                  render={({ field }) => (
                    <CustomDatePicker
                      label="F. Pago"
                      selectedDate={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>

            <div className="flex items-center bg-blue-50 p-3 rounded-lg border border-blue-200 mt-2 hover:bg-blue-100 transition-colors">
              <input
                type="checkbox"
                id="is_active_check"
                {...registerStudy("is_active")}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3 cursor-pointer"
              />
              <label
                htmlFor="is_active_check"
                className="text-sm font-bold text-blue-800 cursor-pointer select-none"
              >
                Estudio Vigente
              </label>
            </div>

            {editingStudy && (
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <label className="block text-sm font-bold text-yellow-800 mb-1">
                  Justificación del Cambio (Auditable)
                </label>
                <input
                  {...registerStudy("justification", { required: true })}
                  className="w-full p-2 border border-yellow-300 rounded"
                  placeholder="Motivo..."
                />
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-primary text-white py-2 rounded font-bold mt-4 hover:bg-blue-800 transition-colors"
            >
              Guardar
            </button>
          </form>
        </div>
      </Modal>

      {/* Modal Usuarios */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Crear Usuario"
      >
        <form onSubmit={handleUserSubmit(onCreateUser)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Nombre</label>
              <input
                {...registerUser("first_name", { required: true })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="text-sm">Apellido</label>
              <input
                {...registerUser("last_name", { required: true })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <div>
            <label className="text-sm">Usuario</label>
            <input
              {...registerUser("username", { required: true })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="text-sm">Email</label>
            <input
              type="email"
              {...registerUser("email", { required: true })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="text-sm">Contraseña</label>
            <input
              type="password"
              {...registerUser("password", { required: true })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div className="flex items-center bg-blue-50 p-4 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
            <input
              type="checkbox"
              id="is_staff_check"
              {...registerUser("is_staff")}
              className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary mr-3 cursor-pointer"
            />
            <div className="flex flex-col">
              <label
                htmlFor="is_staff_check"
                className="text-sm font-bold text-blue-900 cursor-pointer select-none"
              >
                Permisos de Administrador
              </label>
              <span className="text-xs text-blue-700">
                Permite gestionar usuarios, ver auditoría y editar catálogos.
              </span>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded font-bold hover:bg-blue-800 transition-colors"
          >
            Crear
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
