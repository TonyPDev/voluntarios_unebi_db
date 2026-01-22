import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = () => {
    // Usaremos "token" como clave estándar
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({
          id: decoded.user_id,
          username: decoded.username,
          isAdmin: decoded.is_staff,
          full_name: decoded.full_name || decoded.username,
        });
      } catch (error) {
        console.error("Token inválido", error);
        logout(); // Si el token está corrupto, limpiamos
      }
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      const response = await api.post("token/", { username, password });

      // Guardamos con la clave "token"
      localStorage.setItem("token", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);

      // Decodificamos inmediatamente para actualizar el estado
      const decoded = jwtDecode(response.data.access);
      setUser({
        id: decoded.user_id,
        username: decoded.username,
        isAdmin: decoded.is_staff,
        full_name: decoded.full_name || decoded.username,
      });

      return { success: true };
    } catch (error) {
      // Manejo robusto de errores
      let errorMsg = "Error de conexión";
      if (error.response?.data) {
        if (error.response.data.detail) errorMsg = error.response.data.detail;
        else if (error.response.data.non_field_errors)
          errorMsg = error.response.data.non_field_errors[0];
        else errorMsg = JSON.stringify(error.response.data);
      }
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
