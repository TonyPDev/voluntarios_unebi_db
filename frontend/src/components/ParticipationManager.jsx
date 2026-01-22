import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import { Calendar, Plus, AlertTriangle, CheckCircle } from "lucide-react";

const ParticipationManager = ({
  volunteerId,
  participations = [],
  onUpdate,
}) => {
  const [studies, setStudies] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [serverError, setServerError] = useState("");

  // Formulario para agregar participación
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  // 1. Cargar estudios vigentes para el dropdown
  useEffect(() => {
    api
      .get("studies/")
      .then((res) => setStudies(res.data))
      .catch((err) => console.error("Error cargando estudios", err));
  }, []);

  const handleAddParticipation = async (data) => {
    setServerError("");
    try {
      // endpoint definido en la FASE 1 en VolunteersViewSet
      await api.post(`volunteers/${volunteerId}/add-participation/`, {
        study_id: data.study_id,
        admission_date: data.admission_date,
        justification: data.justification, // ¡Obligatorio!
      });

      reset();
      setIsAdding(false);
      onUpdate(); // Recargar datos del padre
    } catch (error) {
      console.error(error);
      if (error.response?.data?.non_field_errors) {
        // Errores de validación global (ej: regla de 3 meses)
        setServerError(error.response.data.non_field_errors[0]);
      } else if (error.response?.data?.detail) {
        setServerError(error.response.data.detail);
      } else {
        setServerError(
          "Error al registrar participación. Verifique que no esté activo en otro estudio.",
        );
      }
    }
  };

  return (
    <div className="mt-8 border-t pt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <Calendar className="mr-2" /> Historial de Estudios
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-green-600 text-white px-4 py-2 rounded flex items-center hover:bg-green-700 text-sm font-medium"
          >
            <Plus size={16} className="mr-2" /> Registrar en Nuevo Estudio
          </button>
        )}
      </div>

      {/* Formulario de Inscripción (Solo visible al dar click en Agregar) */}
      {isAdding && (
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg mb-6 animate-fade-in">
          <h4 className="font-bold text-lg mb-4 text-gray-700">
            Inscripción a Estudio Vigente
          </h4>

          {serverError && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 flex items-start text-sm">
              <AlertTriangle size={18} className="mr-2 flex-shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit(handleAddParticipation)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Estudio
                </label>
                <select
                  {...register("study_id", {
                    required: "Seleccione un estudio",
                  })}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                >
                  <option value="">-- Seleccionar --</option>
                  {studies.map((study) => (
                    <option key={study.id} value={study.id}>
                      {study.name}
                    </option>
                  ))}
                </select>
                {errors.study_id && (
                  <span className="text-red-500 text-xs">
                    {errors.study_id.message}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fecha de Internamiento
                </label>
                <input
                  type="date"
                  {...register("admission_date", {
                    required: "Fecha requerida",
                  })}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded"
                />
                {errors.admission_date && (
                  <span className="text-red-500 text-xs">
                    {errors.admission_date.message}
                  </span>
                )}
              </div>
            </div>

            {/* Justificación OBLIGATORIA */}
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
              <label className="block text-sm font-bold text-yellow-800 mb-1">
                Justificación de Ingreso (Auditable)
              </label>
              <input
                type="text"
                {...register("justification", {
                  required: "La justificación es obligatoria",
                })}
                placeholder="Ej: Voluntario apto tras revisión médica..."
                className="w-full p-2 border border-yellow-300 rounded focus:ring-yellow-500"
              />
              {errors.justification && (
                <span className="text-red-500 text-xs font-bold">
                  Requerido
                </span>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setServerError("");
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
              >
                Confirmar Inscripción
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Participaciones */}
      <div className="overflow-hidden border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estudio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                F. Internamiento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                F. Pago
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {participations.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-4 text-center text-gray-500 text-sm"
                >
                  Este voluntario no ha participado en estudios aún.
                </td>
              </tr>
            ) : (
              participations.map((part) => (
                <tr key={part.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {part.study_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {part.admission_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {part.payment_date || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {part.payment_date ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Finalizado
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle size={12} className="mr-1" /> Activo
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ParticipationManager;
