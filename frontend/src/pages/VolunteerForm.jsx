import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useForm } from "react-hook-form";
import ParticipationManager from "../components/ParticipationManager";
import { Calendar } from "lucide-react";

const VolunteerForm = () => {
  const { id } = useParams(); // Si hay ID, es edición
  const navigate = useNavigate();
  const isEditing = !!id;

  // React Hook Form
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();
  const [serverError, setServerError] = useState("");
  const [participations, setParticipations] = useState([]);

  // Nuevo estado para la lista de estudios (Dropdown de registro inicial)
  const [studies, setStudies] = useState([]);

  // 1. Cargar datos del voluntario (Si es edición)
  useEffect(() => {
    if (isEditing) {
      loadVolunteerData();
    } else {
      // Si es nuevo registro, cargamos estudios vigentes para el dropdown
      loadStudies();
    }
  }, [id, isEditing, setValue]);

  const loadStudies = async () => {
    try {
      const res = await api.get("studies/");
      setStudies(res.data);
    } catch (error) {
      console.error("Error cargando estudios", error);
    }
  };

  const loadVolunteerData = () => {
    api
      .get(`volunteers/${id}/`)
      .then((res) => {
        const data = res.data;
        setValue("first_name", data.first_name);
        setValue("middle_name", data.middle_name);
        setValue("last_name_paternal", data.last_name_paternal);
        setValue("last_name_maternal", data.last_name_maternal);
        setValue("sex", data.sex);
        setValue("phone", data.phone);
        setValue("curp", data.curp);
        setParticipations(data.participations || []);
      })
      .catch((err) => {
        console.error(err);
        setServerError("No se pudo cargar el voluntario.");
      });
  };

  const onSubmit = async (data) => {
    setServerError("");

    // 1. LIMPIEZA DE DATOS (ESTA ES LA CORRECCIÓN)
    // Creamos una copia para no modificar el original del form
    const payload = { ...data };

    // Si initial_study_id es una cadena vacía (no seleccionó nada), lo eliminamos del envío
    if (!payload.initial_study_id) {
      delete payload.initial_study_id;
      delete payload.initial_admission_date; // También la fecha si no hay estudio
    }

    try {
      if (isEditing) {
        await api.put(`volunteers/${id}/`, payload);
      } else {
        await api.post("volunteers/", payload);
      }
      navigate("/voluntarios");
    } catch (error) {
      if (error.response && error.response.data) {
        const msg =
          typeof error.response.data === "string"
            ? error.response.data
            : JSON.stringify(error.response.data);
        setServerError(msg);
      } else {
        setServerError("Ocurrió un error inesperado.");
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {isEditing ? "Editar Voluntario" : "Registrar Nuevo Voluntario"}
        </h2>

        {serverError && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 break-words">
            <p>{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombres */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Primer Nombre
              </label>
              <input
                {...register("first_name", { required: true })}
                className="mt-1 block w-full p-2 border border-gray-300 rounded"
              />
              {errors.first_name && (
                <span className="text-red-500 text-xs">Requerido</span>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Segundo Nombre (Opcional)
              </label>
              <input
                {...register("middle_name")}
                className="mt-1 block w-full p-2 border border-gray-300 rounded"
              />
            </div>

            {/* Apellidos */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Apellido Paterno
              </label>
              <input
                {...register("last_name_paternal", { required: true })}
                className="mt-1 block w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Apellido Materno
              </label>
              <input
                {...register("last_name_maternal", { required: true })}
                className="mt-1 block w-full p-2 border border-gray-300 rounded"
              />
            </div>

            {/* Datos Demográficos */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Sexo
              </label>
              <select
                {...register("sex", { required: true })}
                className="mt-1 block w-full p-2 border border-gray-300 rounded"
              >
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <input
                {...register("phone", { required: true })}
                className="mt-1 block w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                CURP
              </label>
              <input
                {...register("curp", {
                  required: true,
                  maxLength: 18,
                  minLength: 18,
                })}
                className="mt-1 block w-full p-2 border border-gray-300 rounded uppercase"
              />
              {errors.curp && (
                <span className="text-red-500 text-xs">
                  Debe tener 18 caracteres
                </span>
              )}
            </div>
          </div>

          {/* SECCIÓN NUEVA: Asignación Inicial (Solo para nuevos registros) */}
          {!isEditing && (
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-6 animate-fade-in">
              <h3 className="font-bold text-blue-800 mb-4 flex items-center">
                <Calendar className="mr-2" /> Asignación Inicial (Opcional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Estudio Vigente
                  </label>
                  <select
                    {...register("initial_study_id")}
                    className="mt-1 block w-full p-2 border border-blue-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Ninguno (Solo registro) --</option>
                    {studies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fecha de Internamiento
                  </label>
                  <input
                    type="date"
                    {...register("initial_admission_date")}
                    className="mt-1 block w-full p-2 border border-blue-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                * Si seleccionas un estudio, el voluntario quedará inscrito
                automáticamente al guardarse.
              </p>
            </div>
          )}

          {/* Área de Justificación: Solo visible al editar */}
          {isEditing && (
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mt-6">
              <label className="block text-sm font-bold text-yellow-800 mb-2">
                Justificación del Cambio (Auditable)
              </label>
              <textarea
                {...register("justification", { required: isEditing })}
                placeholder="Describa por qué está modificando este registro..."
                className="w-full p-2 border border-yellow-300 rounded h-24 focus:ring-yellow-500 focus:border-yellow-500"
              ></textarea>
              {errors.justification && (
                <span className="text-red-500 text-xs font-bold">
                  La justificación es obligatoria para guardar cambios.
                </span>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate("/voluntarios")}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded hover:bg-blue-800 font-medium"
            >
              {isEditing ? "Guardar Cambios" : "Registrar Voluntario"}
            </button>
          </div>
        </form>

        {/* Sección de Participaciones (Solo visible al Editar) */}
        {isEditing && (
          <ParticipationManager
            volunteerId={id}
            participations={participations}
            onUpdate={loadVolunteerData}
          />
        )}
      </div>
    </div>
  );
};

export default VolunteerForm;
