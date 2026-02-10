/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb", // Azul más brillante (Blue 600)
        primaryHover: "#1d4ed8", // Azul oscuro para hover
        secondary: "#64748b",
        surface: "#f8fafc", // Fondo gris muy claro
        // Colores de estado
        success: "#10b981", // Verde
        warning: "#f59e0b", // Naranja
        danger: "#ef4444", // Rojo
        info: "#3b82f6", // Azul claro
      },
    },
  },
  plugins: [],
};
