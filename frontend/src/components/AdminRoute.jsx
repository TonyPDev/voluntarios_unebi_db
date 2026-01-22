import { Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const AdminRoute = () => {
  const { user } = useContext(AuthContext);

  // Si no está logueado, al login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si está logueado pero NO es admin, a la home de voluntarios.
  if (!user.isAdmin) {
    return <Navigate to="/voluntarios" replace />;
  }

  // Si es admin, pase usted.
  return <Outlet />;
};

export default AdminRoute;
