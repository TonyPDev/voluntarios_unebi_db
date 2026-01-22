import { useEffect, useState } from "react";
import api from "../api/axios";
import { Link } from "react-router-dom";
import { Edit, Plus } from "lucide-react"; // Importaciones cruciales
import SmartTable from "../components/SmartTable";

const VolunteerList = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVolunteers = async () => {
    setLoading(true);
    try {
      const res = await api.get("volunteers/");
      setVolunteers(res.data);
    } catch (error) {
      console.error("Error cargando voluntarios", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteers();
  }, []);

  // Definición de las columnas para la SmartTable
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
    { key: "curp", label: "CURP" },
    { key: "phone", label: "Teléfono" },
    {
      key: "active_study",
      label: "Estudio Actual",
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
      key: "is_eligible",
      label: "Estatus",
      render: (row) =>
        row.is_eligible ? (
          <span className="text-green-600 font-bold text-sm">Apto</span>
        ) : (
          <span className="text-red-500 font-bold text-sm">En espera</span>
        ),
    },
    {
      key: "actions",
      label: "Acciones",
      render: (row) => (
        <Link
          to={`/voluntarios/editar/${row.id}`}
          className="text-gray-500 hover:text-primary transition-colors"
        >
          <Edit size={18} />
        </Link>
      ),
    },
  ];

  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">
        Cargando directorio...
      </div>
    );

  return (
    <SmartTable
      title="Directorio de Voluntarios"
      data={volunteers}
      columns={columns}
      actions={
        <Link
          to="/voluntarios/nuevo"
          className="bg-primary text-white px-4 py-2 rounded flex items-center hover:bg-blue-800 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Nuevo
        </Link>
      }
    />
  );
};

export default VolunteerList;
