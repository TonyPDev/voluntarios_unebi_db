import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { LogOut, User, Shield, Activity, Users, Menu } from "lucide-react";

const DashboardLayout = () => {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Función auxiliar para saber si un link está activo
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER REDISEÑADO */}
      <nav className="bg-white shadow-md border-b border-gray-100 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-800 tracking-tight">
                  Voluntarios <span className="text-blue-600">UNEBI</span>
                </span>
              </Link>

              {/* Separador Vertical */}
              <div className="hidden md:block h-6 w-px bg-gray-300 mx-6"></div>

              {/* Enlaces de Navegación */}
              <div className="hidden md:flex space-x-4">
                <Link
                  to="/voluntarios"
                  className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive("/voluntarios")
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Users size={18} className="mr-2" />
                  Voluntarios
                </Link>

                {user?.isAdmin && (
                  <Link
                    to="/admin"
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive("/admin")
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <Shield size={18} className="mr-2" />
                    Panel Admin
                  </Link>
                )}
              </div>
            </div>

            {/* PERFIL Y SALIR (DERECHA) */}
            <div className="flex items-center gap-4">
              {/* Info Usuario */}
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-gray-800 leading-none">
                  {user?.full_name || user?.username || "Usuario"}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  {user?.isAdmin ? "Administrador" : "Staff"}
                </span>
              </div>

              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                {/* Iniciales del usuario */}
                {(
                  user?.full_name?.[0] ||
                  user?.username?.[0] ||
                  "U"
                ).toUpperCase()}
              </div>

              <div className="h-6 w-px bg-gray-300 mx-1"></div>

              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                title="Cerrar Sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 animate-fade-in">
        <Outlet />
      </main>

      {/* FOOTER SIMPLE */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-gray-400">
          © 2026 Sistema de Gestión de Voluntarios UNEBI. Todos los derechos
          reservados.
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;
