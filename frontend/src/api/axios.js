import axios from "axios";
import { jwtDecode } from "jwt-decode";

// No asumo localhost, pero para desarrollo local es lo estándar.
// Si subes a prod, cambia esto por una variable de entorno.
const baseURL = "http://127.0.0.1:8000/api/";

const api = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Interceptor para inyectar el token en cada petición
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      const decoded = jwtDecode(token);
      const isExpired = decoded.exp < Date.now() / 1000;

      if (isExpired) {
        // Aquí podrías implementar la lógica de refresh token
        // Por simplicidad, si expira, cerramos sesión
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject("Token expirado");
      }

      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
