import axios from "axios";
import { jwtDecode } from "jwt-decode";

// Asegúrate de que esta URL sea la misma que configuraste en el paso anterior (tu IP o localhost)
const baseURL = "http://192.168.20.109:8000/api/";

const api = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem("token");

    if (token) {
      const decoded = jwtDecode(token);
      const isExpired = decoded.exp < Date.now() / 1000;

      if (isExpired) {
        const refreshToken = localStorage.getItem("refresh");

        if (!refreshToken) {
          // Si no hay refresh token, sí cerramos sesión
          localStorage.clear();
          window.location.href = "/login";
          return Promise.reject("No hay refresh token disponible");
        }

        try {
          console.log("Token expirado. Intentando renovar...");

          // Usamos una instancia limpia de axios para evitar bucles infinitos
          // Nota: Concatenamos 'token/refresh/' a la baseURL
          const response = await axios.post(`${baseURL}token/refresh/`, {
            refresh: refreshToken,
          });

          // 1. Guardamos el nuevo token
          const newAccessToken = response.data.access;
          localStorage.setItem("token", newAccessToken);

          // 2. Actualizamos la variable local para usarla en esta misma petición
          token = newAccessToken;

          console.log("Token renovado con éxito.");
        } catch (error) {
          // Si el refresh token también venció (pasaron 24h) o es inválido
          console.error("No se pudo renovar el token:", error);
          localStorage.clear();
          window.location.href = "/login";
          return Promise.reject("Sesión expirada totalmente");
        }
      }

      // Asignamos el token (ya sea el viejo válido o el nuevo recién renovado)
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
