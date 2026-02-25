import {
  useEffect,
  useState,
  useContext,
  useMemo,
  useCallback,
  useRef,
} from "react";
import api from "../api/axios";
import {
  Edit,
  Plus,
  Eye,
  FileSpreadsheet,
  Download,
  Upload,
  FileDown,
  Users,
  UserCheck,
  FlaskConical,
  CalendarClock,
  ClipboardList,
  Hourglass,
  Ban,
  X,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Phone,
  PhoneOff,
  CheckSquare,
  MoreVertical,
  ShieldCheck,
  Play,
  Trash2,
  RefreshCw,
  User,
  CalendarPlus,
  Info,
  RotateCcw, // Nuevo ícono para reevaluación
  UserX, // Nuevo ícono para edad
} from "lucide-react";
import Modal from "../components/Modal";
import SmartTable from "../components/SmartTable";
import { AuthContext } from "../context/AuthContext";
import VolunteerForm from "./VolunteerForm";
import ParticipationManager from "../components/ParticipationManager";

// ... [ResponsiveStudyTags] ... (Mismo código)
const ResponsiveStudyTags = ({ participations }) => {
  const containerRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const calculateVisibleItems = (containerWidth) => {
      let currentWidth = 0;
      let count = 0;
      const badgeApproxWidth = 35;
      const gap = 4;
      const estimateWidth = (text) => text.length * 7 + 14;

      for (let i = 0; i < participations.length; i++) {
        const itemWidth = estimateWidth(participations[i].study_name);
        if (
          currentWidth + itemWidth + gap + badgeApproxWidth <=
          containerWidth
        ) {
          currentWidth += itemWidth + gap;
          count++;
        } else {
          if (
            i === participations.length - 1 &&
            currentWidth + itemWidth <= containerWidth
          ) {
            count++;
          }
          break;
        }
      }
      return Math.max(1, count);
    };

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        setVisibleCount(calculateVisibleItems(width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [participations]);

  if (!participations || participations.length === 0)
    return <span className="text-gray-300 text-xs italic">-</span>;

  const visibleItems = participations.slice(0, visibleCount);
  const remainder = participations.length - visibleCount;
  const fullListString = participations.map((p) => p.study_name).join(", ");

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1 w-full overflow-hidden"
      title={`Historial completo: ${fullListString}`}
    >
      {visibleItems.map((p, index) => (
        <span
          key={index}
          className="text-[10px] font-medium bg-gray-50 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap"
        >
          {p.study_name}
        </span>
      ))}
      {remainder > 0 && (
        <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap shrink-0">
          +{remainder}
        </span>
      )}
    </div>
  );
};

// ... [ActionMenu] ... (Mismo código)
const ActionMenu = ({ row, actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex justify-center" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
      >
        <MoreVertical size={18} />
      </button>

      {isOpen && (
        <div className="absolute right-8 top-0 z-50 w-48 bg-white rounded-lg shadow-xl border border-gray-100 animate-fade-in-up overflow-hidden">
          {actions.map((group, idx) => (
            <div key={idx} className="border-b border-gray-100 last:border-0">
              {group.title && (
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-400 bg-gray-50/50">
                  {group.title}
                </div>
              )}
              {group.items.map((item, itemIdx) => (
                <button
                  key={itemIdx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    item.onClick(row);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${item.className || "text-gray-700"}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const VolunteerList = () => {
  const { user } = useContext(AuthContext);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("todos");

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [showHistoryFor, setShowHistoryFor] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Modal para acciones
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    volunteerId: null,
    volunteerName: "",
    volunteerCode: "",
    type: "",
    payload: "",
    title: "",
    description: "",
  });
  const [actionJustification, setActionJustification] = useState("");

  const [rejectionCategory, setRejectionCategory] = useState("");
  const [statusReason, setStatusReason] = useState("");

  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  const [availableStudies, setAvailableStudies] = useState([]);
  const [selectedNewStudyId, setSelectedNewStudyId] = useState("");
  const [selectedVolunteers, setSelectedVolunteers] = useState([]);

  // --- CARGA DE DATOS ---
  const fetchVolunteers = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await api.get("volunteers/");
      const processedData = res.data.map((v) => {
        const sortedParticipations = [...(v.participations || [])].sort(
          (a, b) => b.id - a.id,
        );
        return {
          ...v,
          participations: sortedParticipations,
          full_name_search:
            `${v.first_name} ${v.middle_name || ""} ${v.last_name_paternal} ${v.last_name_maternal}`.trim(),
          study_names_filter: v.participations?.map((p) => p.study_name) || [],
          raw_status: v.status,
          creation_date_fmt: new Date(v.created_at).toLocaleDateString(),
          creation_year_filter: new Date(v.created_at).getFullYear().toString(),
          code_year_filter: v.code ? v.code.split("-")[1] : "",
          code_number_sort: v.code ? parseInt(v.code.split("-")[2] || 0) : 0,
        };
      });
      setVolunteers(processedData);
    } catch (error) {
      console.error("Error cargando voluntarios", error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  const fetchStudies = async () => {
    try {
      const res = await api.get("studies/");
      setAvailableStudies(res.data.filter((s) => s.is_active));
    } catch (error) {
      console.error("Error cargando estudios", error);
    }
  };

  useEffect(() => {
    fetchVolunteers(false);
    fetchStudies();
    const intervalId = setInterval(() => fetchVolunteers(true), 5000);
    return () => clearInterval(intervalId);
  }, [fetchVolunteers]);

  // --- FUNCIÓN DE VALIDACIÓN ---
  const validateVolunteerData = (volunteer) => {
    const requiredFields = [
      { key: "first_name", label: "Nombre" },
      { key: "last_name_paternal", label: "Apellido Paterno" },
      { key: "last_name_maternal", label: "Apellido Materno" },
      { key: "birth_date", label: "Fecha de Nacimiento" },
      { key: "sex", label: "Sexo" },
      { key: "curp", label: "CURP" },
      { key: "phone", label: "Teléfono" },
    ];

    const missing = requiredFields
      .filter((field) => !volunteer[field.key])
      .map((field) => field.label);

    return missing;
  };

  // --- MANEJO DE ACCIONES ---
  const openActionModal = (row, type, payload, title, description) => {
    const missingFields = validateVolunteerData(row);
    if (missingFields.length > 0) {
      setValidationErrors(missingFields);
      setIsValidationModalOpen(true);
      return;
    }

    setActionModal({
      isOpen: true,
      volunteerId: row.id,
      volunteerName: row.full_name_search,
      volunteerCode: row.code,
      type: type,
      payload: payload,
      title: title,
      description: description,
    });
    setActionJustification("");
    setSelectedNewStudyId("");
    setRejectionCategory("");
    setStatusReason("");
  };

  const handleActionSubmit = async () => {
    if (!actionJustification.trim()) {
      alert("La justificación de auditoría es obligatoria.");
      return;
    }

    try {
      if (actionModal.type === "status_change") {
        const payload = {
          manual_status: actionModal.payload,
          justification: actionJustification,
        };

        if (actionModal.payload === "rejected") {
          if (!rejectionCategory) {
            alert("Debes seleccionar una categoría de rechazo.");
            return;
          }
          if (!statusReason.trim()) {
            alert("Debes escribir las observaciones del rechazo.");
            return;
          }
          payload.rejection_category = rejectionCategory;
          payload.status_reason = statusReason;
        }

        if (actionModal.payload === "eligible") {
          if (statusReason.trim()) payload.status_reason = statusReason;
        }

        await api.patch(`volunteers/${actionModal.volunteerId}/`, payload);
      } else if (actionModal.type === "remove_study") {
        await api.post(
          `volunteers/${actionModal.volunteerId}/remove-current-study/`,
          {
            justification: actionJustification,
          },
        );
      } else if (actionModal.type === "change_study") {
        if (!selectedNewStudyId) {
          alert("Debes seleccionar un nuevo estudio.");
          return;
        }
        await api.post(
          `volunteers/${actionModal.volunteerId}/change-current-study/`,
          {
            new_study_id: selectedNewStudyId,
            justification: actionJustification,
          },
        );
      } else if (actionModal.type === "assign_study") {
        if (!selectedNewStudyId) {
          alert("Debes seleccionar un estudio.");
          return;
        }
        await api.post(
          `volunteers/${actionModal.volunteerId}/add-participation/`,
          {
            study_id: selectedNewStudyId,
            justification: actionJustification,
          },
        );
      }

      setActionModal({ ...actionModal, isOpen: false });
      fetchVolunteers(false);
    } catch (error) {
      alert(
        "Error al procesar la acción: " +
          (error.response?.data?.detail || error.message),
      );
    }
  };

  // --- TOGGLE CONTACTADO ---
  const toggleContacted = useCallback(async (row) => {
    setVolunteers((prev) =>
      prev.map((v) =>
        v.id === row.id ? { ...v, contacted: !v.contacted } : v,
      ),
    );
    try {
      await api.patch(`volunteers/${row.id}/`, {
        contacted: !row.contacted,
        justification: "Cambio rápido de estatus 'Contactado' (Toggle)",
      });
    } catch (error) {
      setVolunteers((prev) =>
        prev.map((v) =>
          v.id === row.id ? { ...v, contacted: row.contacted } : v,
        ),
      );
      alert("No se pudo actualizar el estatus.");
    }
  }, []);

  const activeVolunteer = useMemo(() => {
    if (!showHistoryFor) return null;
    return volunteers.find((v) => v.id === showHistoryFor.id) || showHistoryFor;
  }, [volunteers, showHistoryFor]);

  // --- ACTUALIZACIÓN DE CONTEOS ---
  const counts = useMemo(
    () => ({
      todos: volunteers.length,
      aptos: volunteers.filter((v) => v.raw_status === "Apto").length,
      en_estudio: volunteers.filter((v) => v.raw_status === "En estudio")
        .length,
      asignado: volunteers.filter((v) => v.raw_status === "Estudio asignado")
        .length,
      por_aprobacion: volunteers.filter(
        (v) => v.raw_status === "En espera por aprobación",
      ).length,
      descanso: volunteers.filter(
        (v) => v.raw_status === "En espera (Descanso)",
      ).length,
      reevaluacion: volunteers.filter((v) => v.raw_status === "Reevaluación")
        .length, // NUEVO
      edad: volunteers.filter((v) => v.raw_status === "No elegible por edad")
        .length, // NUEVO
      rechazados: volunteers.filter((v) => v.raw_status.includes("Rechazado"))
        .length, // MODIFICADO (Ya no incluye edad)
    }),
    [volunteers],
  );

  // --- FILTRADO POR PESTAÑA ---
  const filteredData = useMemo(() => {
    switch (activeTab) {
      case "aptos":
        return volunteers.filter((v) => v.raw_status === "Apto");
      case "en_estudio":
        return volunteers.filter((v) => v.raw_status === "En estudio");
      case "asignado":
        return volunteers.filter((v) => v.raw_status === "Estudio asignado");
      case "por_aprobacion":
        return volunteers.filter(
          (v) => v.raw_status === "En espera por aprobación",
        );
      case "descanso":
        return volunteers.filter(
          (v) => v.raw_status === "En espera (Descanso)",
        );
      case "reevaluacion":
        return volunteers.filter((v) => v.raw_status === "Reevaluación"); // NUEVO
      case "edad":
        return volunteers.filter(
          (v) => v.raw_status === "No elegible por edad",
        ); // NUEVO
      case "rechazados":
        return volunteers.filter((v) => v.raw_status.includes("Rechazado")); // MODIFICADO
      default:
        return volunteers;
    }
  }, [volunteers, activeTab]);

  const tabLabels = {
    todos: "Todos",
    aptos: "Aptos",
    en_estudio: "En Estudio",
    asignado: "Asignados",
    por_aprobacion: "Por Aprobar",
    descanso: "En Descanso",
    reevaluacion: "Reevaluación",
    edad: "Edad",
    rechazados: "Rechazados",
  };

  const getTableTitle = () => {
    const titles = {
      todos: "Base de Datos Completa",
      aptos: "Voluntarios Aptos",
      en_estudio: "Participando Actualmente",
      asignado: "Programados para Ingreso",
      por_aprobacion: "Solicitudes Pendientes",
      descanso: "Periodo de Lavado (Descanso)",
      reevaluacion: "Requieren Reevaluación Médica",
      edad: "No Elegibles por Edad (>55)",
      rechazados: "Voluntarios Rechazados",
    };
    return titles[activeTab] || "Voluntarios";
  };

  // ... [Handlers básicos y Exportación] ... (Igual)
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
  const handleSuccess = () => {
    handleCloseModal();
    fetchVolunteers(false);
  };
  const handleDownloadTemplate = async () => {
    /*...*/
  };
  const handleExportData = async (filterType = "todos") => {
    try {
      let queryStr = "";
      if (filterType === "selected") {
        if (selectedVolunteers.length === 0) {
          alert("Sin selección.");
          return;
        }
        queryStr = `ids=${selectedVolunteers.join(",")}`;
      } else {
        const tabParam = filterType === "current" ? activeTab : "todos";
        queryStr = `tab=${tabParam}`;
      }
      const response = await api.get(`volunteers/export/?${queryStr}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const suffix =
        filterType === "selected"
          ? "seleccionados"
          : filterType === "current"
            ? activeTab
            : "todos";
      link.setAttribute("download", `voluntarios_${suffix}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setShowActionsMenu(false);
    } catch (error) {
      alert("Error exportando");
    }
  };
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    try {
      const res = await api.post("volunteers/import/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResults(res.data);
      setIsImportModalOpen(true);
      fetchVolunteers(false);
    } catch (error) {
      alert("Error importando");
    } finally {
      setLoading(false);
      e.target.value = null;
      setShowActionsMenu(false);
    }
  };

  const studyOptions = useMemo(() => {
    const options = new Set();
    volunteers.forEach((v) =>
      v.study_names_filter?.forEach((name) => options.add(name)),
    );
    return Array.from(options).sort();
  }, [volunteers]);

  // --- COLUMNAS ---
  const columns = useMemo(() => {
    const baseCols = [
      {
        key: "code",
        label: "Código",
        width: "120px",
        sortable: true,
        customSort: (a, b) => {
          if (a.code_year_filter !== b.code_year_filter)
            return b.code_year_filter.localeCompare(a.code_year_filter);
          return a.code_number_sort - b.code_number_sort;
        },
        render: (row) => (
          <span className="font-mono font-bold text-blue-700">
            {row.code || "---"}
          </span>
        ),
      },
      {
        key: "full_name_search",
        label: "Nombre Completo",
        width: "220px",
        sortable: true,
        render: (row) => (
          <div className="flex flex-col justify-center">
            <span
              className="font-medium text-gray-900 truncate"
              title={row.full_name_search}
            >
              {row.full_name_search}
            </span>
            <span className="text-xs text-gray-400 truncate">
              {row.email || ""}
            </span>
          </div>
        ),
      },
      {
        key: "history",
        label: "Historial",
        width: "180px",
        filterKey: "study_names_filter",
        filterOptions: studyOptions,
        render: (row) => (
          <ResponsiveStudyTags participations={row.participations} />
        ),
      },
      {
        key: "last_study",
        label: "Último Estudio",
        width: "140px",
        defaultHidden: activeTab !== "descanso",
        render: (row) => (
          <span className="text-sm text-gray-600">{row.last_study || "-"}</span>
        ),
      },
      {
        key: "active_study",
        label: "Estudio Actual",
        width: "140px",
        render: (row) =>
          row.active_study ? (
            <span className="bg-indigo-50 text-indigo-700 text-[11px] px-2 py-1 rounded-md font-semibold border border-indigo-100 block text-center truncate">
              {row.active_study}
            </span>
          ) : (
            <span className="text-gray-300 text-xs">-</span>
          ),
      },
      { key: "age", label: "Edad", width: "70px", sortable: true },
      {
        key: "sex",
        label: "Sexo",
        width: "60px",
        filterKey: "sex",
        defaultHidden: true,
        filterOptions: ["M", "F"],
      },
      { key: "curp", label: "CURP", width: "170px" },
      { key: "phone", label: "Teléfono", width: "110px" },
      {
        key: "status",
        label: "Estatus",
        width: "150px",
        filterKey: "status",
        filterOptions: [
          "Apto",
          "En estudio",
          "Estudio asignado",
          "En espera por aprobación",
          "En espera (Descanso)",
          "Rechazado",
          "Reevaluación",
          "No elegible por edad",
        ],
        render: (row) => {
          const s = row.status || "";
          let style = "bg-gray-100 text-gray-600 border-gray-200";
          if (s === "Apto")
            style = "bg-green-50 text-green-700 border-green-200";
          else if (s === "En estudio")
            style = "bg-indigo-50 text-indigo-700 border-indigo-200";
          else if (s === "Estudio asignado")
            style = "bg-violet-50 text-violet-700 border-violet-200";
          else if (s === "En espera por aprobación")
            style = "bg-orange-50 text-orange-700 border-orange-200";
          else if (s === "En espera (Descanso)")
            style = "bg-teal-50 text-teal-700 border-teal-200";
          else if (s === "Reevaluación")
            style = "bg-cyan-50 text-cyan-700 border-cyan-200"; // NUEVO COLOR
          else if (s.includes("Rechazado"))
            style = "bg-red-50 text-red-700 border-red-200";
          else if (s.includes("No elegible"))
            style = "bg-gray-50 text-gray-500 border-gray-200"; // NUEVO COLOR
          return (
            <span
              className={`px-2 py-1 rounded-full text-[10px] font-bold border ${style} block text-center truncate`}
            >
              {s}
            </span>
          );
        },
      },
    ];

    if (activeTab === "aptos") {
      baseCols.push({
        key: "contacted",
        label: "Contactado",
        width: "100px",
        filterKey: "contacted",
        filterOptions: [true, false],
        render: (row) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleContacted(row);
            }}
            className={`flex justify-center w-full p-1 rounded-full transition-colors ${row.contacted ? "text-green-600 hover:bg-green-100" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"}`}
          >
            {row.contacted ? <Phone size={18} /> : <PhoneOff size={18} />}
          </button>
        ),
      });
    }

    if (activeTab === "rechazados") {
      baseCols.push({
        key: "rejection_info",
        label: "Motivo Rechazo",
        width: "250px",
        render: (row) => (
          <div className="flex flex-col text-xs">
            <span className="font-bold text-red-700">
              {row.rejection_category || "Sin categoría"}
            </span>
            <span
              className="text-gray-600 italic line-clamp-2"
              title={row.status_reason}
            >
              {row.status_reason || "Sin observaciones"}
            </span>
          </div>
        ),
      });
    }

    baseCols.push({
      key: "actions",
      label: "Acciones",
      width: "80px",
      allowOverflow: true,
      render: (row) => {
        const menuActions = [
          {
            items: [
              {
                icon: <Eye size={16} />,
                label: "Ver Detalles",
                onClick: () => handleView(row.id),
              },
              ...(user?.isAdmin
                ? [
                    {
                      icon: <Edit size={16} />,
                      label: "Editar",
                      onClick: () => handleEdit(row.id),
                    },
                  ]
                : []),
              {
                icon: <FlaskConical size={16} />,
                label: "Historial",
                onClick: () => setShowHistoryFor(row),
              },
            ],
          },
        ];

        if (user?.isAdmin) {
          // PARA PENDIENTES Y REEVALUACIÓN
          if (
            row.raw_status === "En espera por aprobación" ||
            row.raw_status === "Reevaluación"
          ) {
            menuActions.push({
              title: "Validar",
              items: [
                {
                  icon: <CheckCircle size={16} className="text-green-600" />,
                  label: "Aceptar (Apto)",
                  onClick: () =>
                    openActionModal(
                      row,
                      "status_change",
                      "eligible",
                      "Declarar como Apto",
                      "Se actualizará el estatus administrativo.",
                    ),
                },
                {
                  icon: <Ban size={16} className="text-red-600" />,
                  label: "Rechazar",
                  onClick: () =>
                    openActionModal(
                      row,
                      "status_change",
                      "rejected",
                      "Rechazar Voluntario",
                      "El voluntario quedará marcado como no elegible.",
                    ),
                },
              ],
            });
          }

          if (row.raw_status === "Apto") {
            menuActions.push({
              title: "Gestión",
              items: [
                {
                  icon: <CalendarPlus size={16} className="text-blue-600" />,
                  label: "Asignar Estudio",
                  onClick: () =>
                    openActionModal(
                      row,
                      "assign_study",
                      null,
                      "Asignar Estudio",
                      "Selecciona el estudio para inscribir al voluntario.",
                    ),
                },
              ],
            });
          }

          if (
            row.raw_status === "Estudio asignado" ||
            row.raw_status === "En estudio"
          ) {
            const studyItems = [];

            if (row.raw_status === "Estudio asignado") {
              studyItems.push({
                icon: <Play size={16} className="text-indigo-600" />,
                label: "Iniciar Estudio",
                className: "text-indigo-700 font-medium",
                onClick: () =>
                  openActionModal(
                    row,
                    "status_change",
                    "in_study",
                    "Iniciar Participación",
                    "El estatus cambiará a 'En estudio'.",
                  ),
              });
            }

            if (row.raw_status === "En estudio") {
              studyItems.push({
                icon: <ShieldCheck size={16} />,
                label: "Regresar a Asignado",
                onClick: () =>
                  openActionModal(
                    row,
                    "status_change",
                    "study_assigned",
                    "Regresar a Asignado",
                    "Corrección de estatus.",
                  ),
              });
            }

            studyItems.push({
              icon: <RefreshCw size={16} className="text-blue-600" />,
              label: "Cambiar de estudio",
              onClick: () =>
                openActionModal(
                  row,
                  "change_study",
                  null,
                  "Cambiar Estudio Actual",
                  "Selecciona el nuevo estudio para reasignar al voluntario.",
                ),
            });

            studyItems.push({
              icon: <Trash2 size={16} className="text-red-500" />,
              label: "Desasignar estudio",
              className: "text-red-600 hover:bg-red-50",
              onClick: () =>
                openActionModal(
                  row,
                  "remove_study",
                  null,
                  "Desasignar Estudio",
                  "Se eliminará el estudio actual y el voluntario pasará a estatus 'Apto' automáticamente.",
                ),
            });

            menuActions.push({
              title: "Gestión de Estudio",
              items: studyItems,
            });
          }
        }

        return <ActionMenu row={row} actions={menuActions} />;
      },
    });

    return baseCols;
  }, [activeTab, studyOptions, user?.isAdmin, toggleContacted]);

  const FilterTab = ({ id, label, icon: Icon, color, count }) => {
    const isActive = activeTab === id;
    const activeClasses = {
      blue: "border-blue-600 text-blue-700 bg-blue-50",
      green: "border-green-600 text-green-700 bg-green-50",
      indigo: "border-indigo-600 text-indigo-700 bg-indigo-50",
      violet: "border-violet-600 text-violet-700 bg-violet-50",
      orange: "border-orange-500 text-orange-700 bg-orange-50",
      teal: "border-teal-600 text-teal-700 bg-teal-50",
      cyan: "border-cyan-600 text-cyan-700 bg-cyan-50",
      gray: "border-gray-600 text-gray-700 bg-gray-50",
      red: "border-red-600 text-red-700 bg-red-50",
    };
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all min-w-max outline-none focus:outline-none ${isActive ? activeClasses[color] : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
      >
        <Icon size={16} className={isActive ? "stroke-[2.5px]" : ""} /> {label}{" "}
        <span
          className={`ml-1 text-[10px] px-2 py-0.5 rounded-full ${isActive ? "bg-white shadow-sm border border-gray-100" : "bg-gray-100 text-gray-500"}`}
        >
          {count}
        </span>
      </button>
    );
  };

  if (loading && !volunteers.length)
    return (
      <div className="p-10 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500">Cargando...</p>
      </div>
    );

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/30 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              Directorio de Voluntarios
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestiona los estados clínicos de los voluntarios.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 leading-none">
                {counts.todos}
              </div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                Total
              </div>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600 leading-none">
                {counts.aptos}
              </div>
              <div className="text-[10px] font-bold text-green-600/60 uppercase tracking-wider mt-1">
                Aptos
              </div>
            </div>
          </div>
        </div>
        <div className="flex overflow-x-auto px-2 scrollbar-hide">
          <FilterTab
            id="todos"
            label="Todos"
            icon={Users}
            count={counts.todos}
            color="blue"
          />
          <FilterTab
            id="aptos"
            label="Aptos"
            icon={UserCheck}
            count={counts.aptos}
            color="green"
          />
          <FilterTab
            id="en_estudio"
            label="En Estudio"
            icon={FlaskConical}
            count={counts.en_estudio}
            color="indigo"
          />
          <FilterTab
            id="asignado"
            label="Asignados"
            icon={CalendarClock}
            count={counts.asignado}
            color="violet"
          />
          <FilterTab
            id="por_aprobacion"
            label="Por Aprobar"
            icon={ClipboardList}
            count={counts.por_aprobacion}
            color="orange"
          />
          <FilterTab
            id="descanso"
            label="Descanso"
            icon={Hourglass}
            count={counts.descanso}
            color="teal"
          />
          {/* NUEVAS PESTAÑAS */}
          <FilterTab
            id="reevaluacion"
            label="Reevaluación"
            icon={RotateCcw}
            count={counts.reevaluacion}
            color="cyan"
          />
          <FilterTab
            id="edad"
            label="Edad"
            icon={UserX}
            count={counts.edad}
            color="gray"
          />
          <FilterTab
            id="rechazados"
            label="Rechazados"
            icon={Ban}
            count={counts.rechazados}
            color="red"
          />
        </div>
      </div>

      <div className="flex-1">
        <SmartTable
          key={activeTab}
          title={getTableTitle()}
          data={filteredData}
          columns={columns}
          onSelectionChange={setSelectedVolunteers}
          actions={
            user?.isAdmin && (
              <div className="flex gap-3">
                <div className="relative">
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className={`flex items-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium shadow-sm ${showActionsMenu ? "ring-2 ring-blue-100 border-blue-400" : ""}`}
                  >
                    <FileSpreadsheet size={16} className="text-green-600" />
                    <span>Gestión de Datos</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${showActionsMenu ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showActionsMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowActionsMenu(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-fade-in-up">
                        <div className="p-2">
                          <div className="text-xs font-bold text-gray-400 px-3 py-1 uppercase tracking-wider">
                            Importación
                          </div>
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            id="excel-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                          />
                          <button
                            onClick={() =>
                              document.getElementById("excel-upload").click()
                            }
                            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors text-left"
                          >
                            <Upload size={16} /> Importar Excel
                          </button>
                          <button
                            onClick={handleDownloadTemplate}
                            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors text-left"
                          >
                            <FileDown size={16} /> Descargar Plantilla
                          </button>
                          <div className="h-px bg-gray-100 my-1"></div>
                          <div className="text-xs font-bold text-gray-400 px-3 py-1 uppercase tracking-wider">
                            Exportación
                          </div>
                          <button
                            onClick={() => handleExportData("selected")}
                            disabled={selectedVolunteers.length === 0}
                            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors text-left font-medium disabled:opacity-50"
                          >
                            <CheckSquare size={16} /> Exportar Seleccionados (
                            {selectedVolunteers.length})
                          </button>
                          <button
                            onClick={() => handleExportData("current")}
                            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors text-left font-medium"
                          >
                            <Download size={16} /> Exportar{" "}
                            {tabLabels[activeTab] || "Vista Actual"}
                          </button>
                          <button
                            onClick={() => handleExportData("todos")}
                            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded-lg transition-colors text-left"
                          >
                            <Users size={16} /> Exportar Base Completa
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold shadow-md shadow-blue-600/20 active:scale-95"
                >
                  <Plus size={18} /> <span>Nuevo Voluntario</span>
                </button>
              </div>
            )
          }
        />
      </div>

      {/* MODAL DE VALIDACIÓN DE CAMPOS FALTANTES */}
      <Modal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        title="Datos Incompletos"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-red-600 font-bold">
            <AlertTriangle size={24} />
            <h3>No se puede realizar esta acción</h3>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 shadow-inner">
            <p className="text-sm text-red-800 mb-2">
              El voluntario seleccionado tiene los siguientes datos obligatorios
              vacíos:
            </p>
            <ul className="list-disc pl-5 text-sm text-red-700 font-medium space-y-1">
              {validationErrors.map((field, index) => (
                <li key={index}>{field}</li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            Por favor, edita la información del voluntario y completa los campos
            faltantes antes de continuar.
          </p>

          <div className="flex justify-end">
            <button
              onClick={() => setIsValidationModalOpen(false)}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 font-medium"
            >
              Entendido
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL DE ACCIÓN CON JUSTIFICACIÓN */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ ...actionModal, isOpen: false })}
        title={actionModal.title}
      >
        <div className="space-y-4">
          {/* INFORMACIÓN DEL VOLUNTARIO */}
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0 border border-blue-200">
              <User size={20} />
            </div>
            <div className="overflow-hidden">
              <p
                className="text-sm font-bold text-gray-900 truncate"
                title={actionModal.volunteerName}
              >
                {actionModal.volunteerName || "Sin Nombre"}
              </p>
              <p className="text-xs text-gray-500 font-mono font-medium">
                {actionModal.volunteerCode || "---"}
              </p>
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border ${actionModal.payload === "rejected" ? "bg-red-50 border-red-200 text-red-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}
          >
            <p className="text-sm font-medium">{actionModal.description}</p>
          </div>

          {/* CAMPOS ESPECÍFICOS PARA RECHAZO */}
          {actionModal.payload === "rejected" && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Categoría de Rechazo <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white"
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value)}
                >
                  <option value="">Seleccione...</option>
                  <option value="IMC">IMC</option>
                  <option value="Laboratoriales">Laboratoriales</option>
                  <option value="Incumplimiento">Incumplimiento</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Observaciones del Rechazo{" "}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-red-500 outline-none text-sm h-20"
                  placeholder="Detalles específicos..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                ></textarea>
              </div>
            </div>
          )}

          {/* CAMPOS ESPECÍFICOS PARA APTO (OPCIONAL) */}
          {actionModal.payload === "eligible" && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Observaciones (Opcional)
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm h-20"
                placeholder="Alguna nota sobre la aprobación..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
              ></textarea>
            </div>
          )}

          {/* SELECTOR PARA CAMBIAR O ASIGNAR ESTUDIO */}
          {(actionModal.type === "change_study" ||
            actionModal.type === "assign_study") && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Seleccionar Estudio
              </label>
              <select
                value={selectedNewStudyId}
                onChange={(e) => setSelectedNewStudyId(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              >
                <option value="">Seleccione un estudio...</option>
                {availableStudies.map((study) => (
                  <option key={study.id} value={study.id}>
                    {study.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Justificación de Auditoría <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-1">
              Motivo administrativo por el que realizas esta acción.
            </p>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 text-sm"
              placeholder="Ej: Revisión médica completada..."
              value={actionJustification}
              onChange={(e) => setActionJustification(e.target.value)}
            ></textarea>
          </div>
          <div className="flex justify-end pt-2 gap-2">
            <button
              onClick={() => setActionModal({ ...actionModal, isOpen: false })}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleActionSubmit}
              className={`px-4 py-2 text-white rounded-lg text-sm font-bold shadow-md ${actionModal.payload === "rejected" || actionModal.type === "remove_study" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL DE IMPORTACIÓN */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Resultados de Importación"
      >
        <div className="p-6">
          {importResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
                <CheckCircle className="shrink-0" size={24} />
                <div>
                  <h4 className="font-bold">Proceso Finalizado</h4>
                  <p className="text-sm">
                    Se han registrado exitosamente{" "}
                    <span className="font-bold text-lg">
                      {importResults.created}
                    </span>{" "}
                    voluntarios nuevos.
                  </p>
                </div>
              </div>
              {importResults.has_errors ? (
                <div>
                  <div className="flex items-center gap-2 text-red-600 font-bold mb-2 mt-4">
                    <AlertTriangle size={20} />
                    <span>
                      Registros no importados ({importResults.errors.length})
                    </span>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-60 overflow-y-auto text-sm text-red-800 font-mono shadow-inner">
                    <ul className="list-disc pl-4 space-y-1">
                      {importResults.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 text-sm italic py-4">
                  ¡Excelente! No se encontraron errores.
                </div>
              )}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 font-medium"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* FORMULARIO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-auto relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50 rounded-t-xl shrink-0">
              <h3 className="text-lg font-bold text-gray-800">
                {selectedVolunteerId
                  ? isViewMode
                    ? "Detalle"
                    : "Editar"
                  : "Registrar"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
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

      {/* HISTORIAL RÁPIDO */}
      {activeVolunteer && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[1px]"
          onClick={() => setShowHistoryFor(null)}
        >
          <div
            className="w-full max-w-lg bg-white h-full shadow-2xl animate-slide-in-right flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">
                  {activeVolunteer.full_name_search}
                </h3>
                <span className="text-xs text-gray-500 font-mono">
                  {activeVolunteer.code}
                </span>
              </div>
              <button onClick={() => setShowHistoryFor(null)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <ParticipationManager
                volunteerId={activeVolunteer.id}
                participations={activeVolunteer.participations}
                readOnly={!user?.isAdmin}
                onUpdate={() => fetchVolunteers(false)}
                volunteerStatus={activeVolunteer.raw_status}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolunteerList;
