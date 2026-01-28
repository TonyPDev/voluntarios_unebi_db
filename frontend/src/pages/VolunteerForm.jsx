import { useState, useEffect, useContext } from "react";
import api from "../api/axios";
import { useForm } from "react-hook-form";
import ParticipationManager from "../components/ParticipationManager";
import { Calendar, Lock, ShieldCheck } from "lucide-react"; // ShieldCheck para icono de admin
import { AuthContext } from "../context/AuthContext";
import SearchableSelect from "../components/SearchableSelect";

const VolunteerForm = ({
  idToEdit,
  onClose,
  onSuccess,
  readOnlyMode = false,
  onParticipationChange,
}) => {
  const { user } = useContext(AuthContext);
  const isEditing = !!idToEdit;
  const isReadOnly = isEditing && (!user?.isAdmin || readOnlyMode);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const [serverError, setServerError] = useState("");
  const [participations, setParticipations] = useState([]);
  const [studies, setStudies] = useState([]);

  // Observamos el estatus manual para mostrar/ocultar el campo de motivo
  const manualStatus = watch("manual_status");

  useEffect(() => {
    if (isEditing) {
      loadVolunteerData();
    } else {
      loadStudies();
    }
  }, [idToEdit]);

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
      .get(`volunteers/${idToEdit}/`)
      .then((res) => {
        const data = res.data;
        // Rellenar campos normales
        Object.keys(data).forEach((key) => setValue(key, data[key]));

        setParticipations(data.participations || []);
      })
      .catch((err) => {
        setServerError("No se pudo cargar el voluntario.");
      });
  };

  const onSubmit = async (data) => {
    if (isReadOnly) return;
    setServerError("");
    const payload = { ...data };
    if (!payload.initial_study_id) {
      delete payload.initial_study_id;
      delete payload.initial_admission_date;
    }

    // Validación de motivo para estatus específicos
    if (
      (payload.manual_status === "rejected" ||
        payload.manual_status === "eligible") &&
      !payload.status_reason
    ) {
      setServerError(
        "Debes escribir un motivo para el estatus seleccionado (Apto o Rechazado).",
      );
      return;
    }

    try {
      if (isEditing) {
        await api.put(`volunteers/${idToEdit}/`, payload);
      } else {
        await api.post("volunteers/", payload);
      }
      if (onSuccess) onSuccess();
    } catch (error) {
      if (error.response && error.response.data) {
        setServerError(JSON.stringify(error.response.data));
      } else {
        setServerError("Ocurrió un error inesperado.");
      }
    }
  };

  const selectedStudyId = watch("initial_study_id");

  return (
    <div className="h-full flex flex-col">
      {isReadOnly && (
        <div className="mb-4 flex items-center text-gray-500 bg-gray-100 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200">
          <Lock size={16} className="mr-2" /> Estás viendo este registro en modo
          lectura.
        </div>
      )}

      {serverError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 break-words">
          <p>{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Primer Nombre
            </label>
            <input
              {...register("first_name", { required: !isReadOnly })}
              disabled={isReadOnly}
              className="mt-1 block w-full p-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Segundo Nombre
            </label>
            <input
              {...register("middle_name")}
              disabled={isReadOnly}
              className="mt-1 block w-full p-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Apellido Paterno
            </label>
            <input
              {...register("last_name_paternal", { required: !isReadOnly })}
              disabled={isReadOnly}
              className="mt-1 block w-full p-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Apellido Materno
            </label>
            <input
              {...register("last_name_maternal", { required: !isReadOnly })}
              disabled={isReadOnly}
              className="mt-1 block w-full p-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fecha de Nacimiento
            </label>
            <input
              type="date"
              {...register("birth_date", { required: !isReadOnly })}
              disabled={isReadOnly}
              className="mt-1 block w-full p-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sexo
            </label>
            <select
              {...register("sex", { required: !isReadOnly })}
              disabled={isReadOnly}
              className="mt-1 block w-full p-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-600"
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
              {...register("phone", { required: !isReadOnly })}
              disabled={isReadOnly}
              className="mt-1 block w-full p-2 border border-gray-300 rounded disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              CURP
            </label>
            <input
              {...register("curp", {
                required: !isReadOnly,
                maxLength: 18,
                minLength: 18,
              })}
              disabled={isReadOnly}
              className="mt-1 block w-full p-2 border border-gray-300 rounded uppercase disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
        </div>

        {/* SECCIÓN DE ESTATUS ADMINISTRATIVO (Solo Admin) */}
        {user?.isAdmin && (
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 mt-6">
            <h3 className="font-bold text-purple-800 mb-4 flex items-center">
              <ShieldCheck className="mr-2" /> Dictamen Administrativo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Estatus Manual
                </label>
                <select
                  {...register("manual_status")}
                  disabled={isReadOnly}
                  className="mt-1 block w-full p-2 border border-purple-300 rounded focus:ring-purple-500 focus:border-purple-500 bg-white"
                >
                  <option value="waiting_approval">
                    En espera por aprobación
                  </option>
                  <option value="eligible">Apto</option>
                  <option value="rejected">Rechazado</option>
                </select>
              </div>

              {/* Mostrar motivo solo si es relevante o ya tiene uno */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {manualStatus === "rejected"
                    ? "Motivo de Rechazo"
                    : "Observaciones / Motivo"}
                </label>
                <input
                  type="text"
                  {...register("status_reason")}
                  disabled={isReadOnly}
                  placeholder={
                    manualStatus === "rejected"
                      ? "Ej: No pasó prueba médica"
                      : "Opcional"
                  }
                  className="mt-1 block w-full p-2 border border-purple-300 rounded focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        )}

        {!isEditing && (
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-6">
            <h3 className="font-bold text-blue-800 mb-4 flex items-center">
              <Calendar className="mr-2" /> Asignación Inicial (Opcional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <SearchableSelect
                  label="Estudio Vigente"
                  placeholder="Buscar estudio..."
                  options={studies}
                  value={selectedStudyId}
                  onChange={(val) => setValue("initial_study_id", val)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  F. Internamiento
                </label>
                <input
                  type="date"
                  {...register("initial_admission_date")}
                  className="mt-1 block w-full p-2 border border-blue-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {isEditing && !isReadOnly && (
          <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mt-6">
            <label className="block text-sm font-bold text-yellow-800 mb-2">
              Justificación del Cambio (Auditoría)
            </label>
            <textarea
              {...register("justification", { required: true })}
              placeholder="Motivo general de la edición..."
              className="w-full p-2 border border-yellow-300 rounded h-20 focus:ring-yellow-500 focus:border-yellow-500"
            ></textarea>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            {isReadOnly ? "Cerrar" : "Cancelar"}
          </button>
          {!isReadOnly && (
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded hover:bg-blue-800 font-medium"
            >
              {isEditing ? "Guardar Cambios" : "Registrar"}
            </button>
          )}
        </div>
      </form>

      {isEditing && (
        <div className="mt-6">
          <ParticipationManager
            volunteerId={idToEdit}
            participations={participations}
            onUpdate={loadVolunteerData}
            readOnly={isReadOnly}
            onExternalUpdate={onParticipationChange}
          />
        </div>
      )}
    </div>
  );
};

export default VolunteerForm;
