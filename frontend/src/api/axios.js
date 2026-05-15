import axios from "axios";

// Asegúrate de que esta URL sea la misma que configuraste (tu IP o localhost)
const baseURL = "http://192.168.20.21:8000/api/";

const api = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// 1. INTERCEPTOR DE PETICIÓN (Request)
// Su única función es adjuntar el token actual a cada petición que sale.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 2. INTERCEPTOR DE RESPUESTA (Response)
// Escucha lo que responde el servidor. Si el servidor dice "401 Expirado", renovamos.
api.interceptors.response.use(
  (response) => {
    // Si la petición fue exitosa, simplemente la devolvemos
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Verificamos si el error es 401 (No autorizado)
    // y evitamos bucles infinitos asegurándonos de que no sea la ruta de login/refresh original
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("token/")
    ) {
      originalRequest._retry = true; // Marcamos esta petición para no reintentarla eternamente

      const refreshToken = localStorage.getItem("refresh");

      // Si no hay refresh token, no hay nada que hacer, cerramos sesión
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        console.log(
          "El servidor indicó token expirado. Renovando silenciosamente...",
        );

        // Hacemos una petición limpia (con axios directo) para obtener el nuevo token
        const response = await axios.post(`${baseURL}token/refresh/`, {
          refresh: refreshToken,
        });

        // Guardamos el nuevo token de acceso
        const newAccessToken = response.data.access;
        localStorage.setItem("token", newAccessToken);

        // Algunos backends rotan el refresh token, si manda uno nuevo, lo actualizamos
        if (response.data.refresh) {
          localStorage.setItem("refresh", response.data.refresh);
        }

        console.log(
          "Token renovado con éxito. Reintentando petición original...",
        );

        // Actualizamos la cabecera de la petición original que falló y la volvemos a disparar
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Si la petición de refresh también da error (ej. pasaron más de 24 horas)
        console.error(
          "El Refresh Token también es inválido o expiró. Cerrando sesión.",
          refreshError,
        );
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Si el error no fue 401, lo dejamos pasar para que el componente lo maneje
    return Promise.reject(error);
  },
);

export default api;
