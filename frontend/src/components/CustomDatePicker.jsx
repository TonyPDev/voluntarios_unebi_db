import * as React from "react";
import dayjs from "dayjs";
import "dayjs/locale/es"; // Importamos español para los meses/días
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

export default function CustomDatePicker({
  label,
  selectedDate,
  onChange,
  disabled = false,
  error,
}) {
  // Convertimos el string 'YYYY-MM-DD' que viene del formulario a objeto Dayjs
  const value = selectedDate ? dayjs(selectedDate) : null;

  return (
    <div className="w-full">
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <DatePicker
          label={label}
          value={value}
          onChange={(newValue) => {
            // Convertimos de regreso a string 'YYYY-MM-DD' para el backend
            const formattedDate =
              newValue && newValue.isValid()
                ? newValue.format("YYYY-MM-DD")
                : null;
            onChange(formattedDate);
          }}
          disabled={disabled}
          slotProps={{
            textField: {
              fullWidth: true,
              size: "small", // Para que no se vea gigante comparado con los otros inputs
              error: !!error,
              helperText: error,
              // Estilos para que combine con Tailwind (fondo blanco, borde sutil)
              sx: {
                backgroundColor: "white",
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: error ? "#ef4444" : "#d1d5db", // red-500 o gray-300
                  },
                  "&:hover fieldset": {
                    borderColor: "#2563eb", // blue-600
                  },
                },
              },
            },
            // Configuración para el menú desplegable
            popper: {
              modifiers: [
                {
                  name: "viewHeight",
                  enabled: false,
                },
              ],
            },
          }}
          // Habilitar selector de años rápido
          views={["year", "month", "day"]}
          yearsPerRow={3}
        />
      </LocalizationProvider>
    </div>
  );
}
