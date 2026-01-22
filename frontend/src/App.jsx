import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import VolunteerList from "./pages/VolunteerList";
import VolunteerForm from "./pages/VolunteerForm";
import AdminDashboard from "./pages/AdminDashboard"; // <--- IMPORTAR ESTO (Asegúrate de haber creado el archivo)

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Rutas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Navigate to="/voluntarios" replace />} />
              <Route path="voluntarios" element={<VolunteerList />} />
              <Route path="voluntarios/nuevo" element={<VolunteerForm />} />
              <Route
                path="voluntarios/editar/:id"
                element={<VolunteerForm />}
              />

              {/* <--- AGREGAR ESTA RUTA PARA EL PANEL DE ADMIN */}
              <Route path="admin" element={<AdminDashboard />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
