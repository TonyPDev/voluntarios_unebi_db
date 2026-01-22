import { Outlet, Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { LogOut, User } from "lucide-react";

const DashboardLayout = () => {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-xl font-bold text-primary">
              Gestión Voluntarios
            </span>
            <Link
              to="/voluntarios"
              className="text-gray-600 hover:text-primary text-sm font-medium"
            >
              Voluntarios
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-500">
              <User size={16} className="mr-1" />
              {user?.username || "Usuario"}
            </div>
            <button
              onClick={handleLogout}
              className="text-red-500 hover:text-red-700"
              title="Salir"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
