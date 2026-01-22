import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import VolunteerList from "./pages/VolunteerList";
import VolunteerForm from "./pages/VolunteerForm";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Rutas para TODOS los usuarios logueados */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/voluntarios" replace />} />
              <Route path="voluntarios" element={<VolunteerList />} />

              {/* Lógica condicional interna en el formulario manejará el acceso a "nuevo" */}
              <Route path="voluntarios/nuevo" element={<VolunteerForm />} />
              <Route
                path="voluntarios/editar/:id"
                element={<VolunteerForm />}
              />

              {/* RUTA PROTEGIDA SOLO PARA ADMINS */}
              <Route element={<AdminRoute />}>
                <Route path="admin" element={<AdminDashboard />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
