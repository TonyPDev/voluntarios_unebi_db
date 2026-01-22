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
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        // Asumimos que el backend envía 'user_id' o similar en el payload
        // Si necesitas roles, asegúrate que el backend los incluya en el token
        setUser({
          id: decoded.user_id,
          isAdmin: decoded.is_staff || false, // Ajustar según tu payload JWT real
        });
      } catch (error) {
        localStorage.clear();
        setUser(null);
      }
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      const response = await api.post("token/", { username, password });
      localStorage.setItem("access_token", response.data.access);
      localStorage.setItem("refresh_token", response.data.refresh);
      checkUserStatus();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || "Error de conexión",
      };
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
