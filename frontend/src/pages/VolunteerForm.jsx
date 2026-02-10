import { useState, useEffect, useContext } from "react";
import api from "../api/axios";
import { useForm, Controller } from "react-hook-form";
import ParticipationManager from "../components/ParticipationManager";
import { Calendar, Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import SearchableSelect from "../components/SearchableSelect";
import CustomDatePicker from "../components/CustomDatePicker";

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
    control,
    formState: { errors },
  } = useForm();

  const [serverError, setServerError] = useState("");
  const [participations, setParticipations] = useState([]);
  const [studies, setStudies] = useState([]);
  const [currentStatus, setCurrentStatus] = useState("");

  const manualStatus = watch("manual_status");
  const selectedStudyId = watch("initial_study_id");

  useEffect(() => {
    if (isEditing) {
      loadVolunteerData();
    }
    loadStudies();
  }, [idToEdit]);

  const loadStudies = async () => {
    try {
      const res = await api.get("studies/");
      setStudies(res.data);
    } catch (error) {
      console.error("Error cargando estudios", error);
    }
  };

  const activeStudiesOnly = studies.filter((s) => s.is_active);

  const loadVolunteerData = () => {
    api
      .get(`volunteers/${idToEdit}/`)
      .then((res) => {
        const data = res.data;
        Object.keys(data).forEach((key) => setValue(key, data[key]));
        setParticipations(data.participations || []);
        setCurrentStatus(data.status);
      })
      .catch((err) => setServerError("No se pudo cargar el voluntario."));
  };

  const onSubmit = async (data) => {
    if (isReadOnly) return;
    setServerError("");
    const payload = { ...data };

    if (!payload.initial_study_id) {
      delete payload.initial_study_id;
      delete payload.initial_admission_date;
    }

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
      const msg = error.response?.data
        ? JSON.stringify(error.response.data)
        : "Error inesperado";
      setServerError(msg);
    }
  };

  const showDictamen =
    user?.isAdmin &&
    ["En espera por aprobación", "Apto", "Rechazado"].includes(
      currentStatus || "En espera por aprobación",
    );

  // Helper para mostrar errores
  const ErrorMsg = ({ error }) => {
    if (!error) return null;
    return (
      <div className="flex items-center text-red-500 text-xs mt-1">
        <AlertCircle size={12} className="mr-1" />
        {error.message || "Este campo es requerido"}
      </div>
    );
  };

  const inputClass = (error) =>
    `w-full p-2 border rounded mt-1 outline-none transition-all ${error ? "border-red-500 bg-red-50 focus:ring-1 focus:ring-red-500" : "border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary/20"}`;

  return (
    <div className="h-full flex flex-col">
      {isReadOnly && (
        <div className="mb-4 flex items-center text-gray-500 bg-gray-100 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200">
          <Lock size={16} className="mr-2" /> Modo Lectura
        </div>
      )}

      {serverError && (
        <div className="bg-red-100 text-red-700 p-4 mb-6 rounded-lg border-l-4 border-red-500 text-sm">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PRIMER NOMBRE */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Primer Nombre <span className="text-red-500">*</span>
            </label>
            <input
              {...register("first_name", {
                required: "El nombre es obligatorio",
              })}
              disabled={isReadOnly}
              className={inputClass(errors.first_name)}
            />
            <ErrorMsg error={errors.first_name} />
          </div>

          {/* SEGUNDO NOMBRE (Opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Segundo Nombre
            </label>
            <input
              {...register("middle_name")}
              disabled={isReadOnly}
              className={inputClass(errors.middle_name)}
            />
          </div>

          {/* APELLIDO PATERNO */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Apellido Paterno <span className="text-red-500">*</span>
            </label>
            <input
              {...register("last_name_paternal", {
                required: "El apellido paterno es obligatorio",
              })}
              disabled={isReadOnly}
              className={inputClass(errors.last_name_paternal)}
            />
            <ErrorMsg error={errors.last_name_paternal} />
          </div>

          {/* APELLIDO MATERNO */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Apellido Materno <span className="text-red-500">*</span>
            </label>
            <input
              {...register("last_name_maternal", {
                required: "El apellido materno es obligatorio",
              })}
              disabled={isReadOnly}
              className={inputClass(errors.last_name_maternal)}
            />
            <ErrorMsg error={errors.last_name_maternal} />
          </div>

          {/* FECHA NACIMIENTO */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fecha de nacimiento <span className="text-red-500">*</span>
            </label>
            <Controller
              control={control}
              name="birth_date"
              rules={{ required: "La fecha de nacimiento es obligatoria" }}
              render={({ field }) => (
                <CustomDatePicker
                  selectedDate={field.value}
                  onChange={field.onChange}
                  disabled={isReadOnly}
                  error={errors.birth_date ? errors.birth_date.message : null} // Pasamos el error al componente
                />
              )}
            />
            {/* CustomDatePicker ya debería manejar el mensaje visualmente, pero si no, el helperText lo hará */}
          </div>

          {/* SEXO */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Sexo <span className="text-red-500">*</span>
            </label>
            <select
              {...register("sex", { required: "Seleccione una opción" })}
              disabled={isReadOnly}
              className={inputClass(errors.sex)}
            >
              <option value="">Seleccione...</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
            <ErrorMsg error={errors.sex} />
          </div>

          {/* TELÉFONO */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              {...register("phone", { required: "El teléfono es obligatorio" })}
              disabled={isReadOnly}
              className={inputClass(errors.phone)}
            />
            <ErrorMsg error={errors.phone} />
          </div>

          {/* CURP */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              CURP <span className="text-red-500">*</span>
            </label>
            <input
              {...register("curp", {
                required: "La CURP es obligatoria",
                minLength: {
                  value: 18,
                  message: "La CURP debe tener 18 caracteres",
                },
                maxLength: {
                  value: 18,
                  message: "La CURP debe tener 18 caracteres",
                },
              })}
              disabled={isReadOnly}
              className={`${inputClass(errors.curp)} uppercase`}
            />
            <ErrorMsg error={errors.curp} />
          </div>
        </div>

        {/* DICTAMEN ADMINISTRATIVO */}
        {showDictamen && (
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 mt-6 animate-fade-in">
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
                  className="w-full p-2 border border-purple-300 rounded mt-1 bg-white outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="waiting_approval">
                    En espera por aprobación
                  </option>
                  <option value="eligible">Apto</option>
                  <option value="rejected">Rechazado</option>
                </select>
              </div>
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
                  className="w-full p-2 border border-purple-300 rounded mt-1 outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder={
                    manualStatus === "rejected"
                      ? "Ej: No pasó prueba médica"
                      : "Opcional"
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* ASIGNACIÓN INICIAL */}
        {!isEditing && (
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mt-6">
            <h3 className="font-bold text-blue-800 mb-4 flex items-center">
              <Calendar className="mr-2" /> Asignación Inicial (Opcional)
            </h3>
            <div className="w-full">
              <SearchableSelect
                label="Estudio Vigente"
                placeholder="Buscar estudio..."
                options={activeStudiesOnly}
                value={selectedStudyId}
                onChange={(val) => setValue("initial_study_id", val)}
              />
              <p className="text-xs text-blue-600 mt-2">
                * Al seleccionar un estudio, el voluntario quedará inscrito
                automáticamente con la fecha de internamiento configurada.
              </p>
            </div>
          </div>
        )}

        {isEditing && !isReadOnly && (
          <div className="bg-yellow-50 p-4 rounded border border-yellow-200 mt-6">
            <label className="block text-sm font-bold text-yellow-800 mb-2">
              Justificación del Cambio (Auditable){" "}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register("justification", {
                required:
                  "La justificación es obligatoria para auditar cambios",
              })}
              className={`w-full p-2 border rounded h-20 placeholder-yellow-600/50 outline-none ${errors.justification ? "border-red-500 bg-red-50" : "border-yellow-300"}`}
              placeholder="Describe por qué estás realizando este cambio..."
            ></textarea>
            <ErrorMsg error={errors.justification} />
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
              className="px-6 py-2 bg-primary text-white rounded hover:bg-blue-800 font-medium shadow-md active:scale-95 transition-all"
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
            volunteerStatus={currentStatus}
          />
        </div>
      )}
    </div>
  );
};

export default VolunteerForm;
