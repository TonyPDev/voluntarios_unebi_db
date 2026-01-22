import { useState, useEffect, useContext, useMemo } from "react"; // Agregamos useMemo
import { useForm } from "react-hook-form";
import api from "../api/axios";
import { Calendar, Plus, CheckCircle } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import SearchableSelect from "./SearchableSelect";

const ParticipationManager = ({
  volunteerId,
  participations = [],
  onUpdate,
  readOnly = false,
  onExternalUpdate,
}) => {
  const { user } = useContext(AuthContext);
  const [studies, setStudies] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, reset, setValue, watch } = useForm();

  useEffect(() => {
    if (!readOnly && user?.isAdmin) {
      api
        .get("studies/")
        .then((res) => setStudies(res.data))
        .catch(console.error);
    }
  }, [readOnly, user]);

  // Filtramos los estudios para mostrar solo aquellos en los que el voluntario NO ha participado aún.
  const availableStudies = useMemo(() => {
    return studies.filter((study) => {
      // Verificamos si el ID del estudio ya existe en la lista de participaciones
      return !participations.some((part) => part.study === study.id);
    });
  }, [studies, participations]);

  const handleAddParticipation = async (data) => {
    setServerError("");
    try {
      await api.post(`volunteers/${volunteerId}/add-participation/`, {
        study_id: data.study_id,
        justification: data.justification,
      });
      reset();
      setIsAdding(false);

      onUpdate();

      if (onExternalUpdate) onExternalUpdate();
    } catch (error) {
      setServerError(error.response?.data?.detail || "Error al registrar.");
    }
  };

  const newStudyId = watch("study_id");
  const canAdd = user?.isAdmin && !readOnly;

  return (
    <div className="mt-8 border-t pt-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800 flex items-center">
          <Calendar className="mr-2" /> Historial de Estudios
        </h3>
        {!isAdding && canAdd && (
          <button
            onClick={() => setIsAdding(true)}
            className="bg-green-600 text-white px-4 py-2 rounded flex items-center hover:bg-green-700 text-sm font-medium"
          >
            <Plus size={16} className="mr-2" /> Registrar en Nuevo Estudio
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg mb-6 animate-fade-in">
          <h4 className="font-bold text-lg mb-4 text-gray-700">Inscripción</h4>
          {serverError && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
              {serverError}
            </div>
          )}
          <form
            onSubmit={handleSubmit(handleAddParticipation)}
            className="space-y-4"
          >
            <div>
              <SearchableSelect
                label="Seleccionar Estudio"
                placeholder="Escribe para buscar..."
                options={availableStudies}
                value={newStudyId}
                onChange={(val) =>
                  setValue("study_id", val, { shouldValidate: true })
                }
                error={!newStudyId ? "Requerido" : null}
              />
              {availableStudies.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  Este voluntario ya ha participado en todos los estudios
                  disponibles.
                </p>
              )}
            </div>
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
              <label className="block text-sm font-bold text-yellow-800 mb-1">
                Justificación
              </label>
              <input
                type="text"
                {...register("justification", { required: true })}
                className="w-full p-2 border border-yellow-300 rounded"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 border rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Confirmar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estudio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                F. Internamiento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                F. Pago
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {participations.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                  Sin estudios.
                </td>
              </tr>
            ) : (
              participations.map((part) => (
                <tr key={part.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {part.study_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {part.admission_date || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {part.payment_date || "-"}
                  </td>
                  <td className="px-6 py-4">
                    {part.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle size={12} className="mr-1" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Finalizado
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
