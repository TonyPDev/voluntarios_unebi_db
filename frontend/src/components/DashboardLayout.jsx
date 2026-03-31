import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { LogOut, User, Shield, Activity, Users, Menu, X } from "lucide-react";

const DashboardLayout = () => {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-md border-b border-gray-100 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* LADO IZQUIERDO: Menú Móvil y Logo */}
            <div className="flex items-center">
              {/* Botón de Hamburguesa solo visible en móviles */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden mr-3 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              <Link to="/" className="flex items-center gap-2 group">
                <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-800 tracking-tight hidden sm:block">
                  Voluntarios <span className="text-blue-600">UNEBI</span>
                </span>
                <span className="text-xl font-bold text-gray-800 tracking-tight sm:hidden">
                  UNEBI
                </span>
              </Link>

              <div className="hidden md:block h-6 w-px bg-gray-300 mx-6"></div>

              {/* Menú de Escritorio (Oculto en móviles) */}
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

            {/* LADO DERECHO: Perfil de Usuario */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-gray-800 leading-none">
                  {user?.full_name || user?.username || "Usuario"}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  {user?.isAdmin ? "Administrador" : "Staff"}
                </span>
              </div>

              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                {(
                  user?.full_name?.[0] ||
                  user?.username?.[0] ||
                  "U"
                ).toUpperCase()}
              </div>

              <div className="hidden sm:block h-6 w-px bg-gray-300 mx-1"></div>

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

        {/* MENÚ DESPLEGABLE PARA MÓVILES */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white animate-fade-in-up">
            <div className="px-4 pt-2 pb-4 space-y-2 shadow-inner">
              <Link
                to="/voluntarios"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-base font-bold transition-colors ${
                  isActive("/voluntarios")
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <Users size={20} className="mr-3" />
                  Directorio Voluntarios
                </div>
              </Link>

              {user?.isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-base font-bold transition-colors ${
                    isActive("/admin")
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center">
                    <Shield size={20} className="mr-3" />
                    Panel Administrativo
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 w-full px-6 py-6 animate-fade-in">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="w-full px-6 text-center text-xs text-gray-400">
          © 2026 Sistema de Gestión de Voluntarios UNEBI. Todos los derechos
          reservados.
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;
