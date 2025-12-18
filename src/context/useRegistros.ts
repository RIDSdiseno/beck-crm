import { useContext } from "react";
import { RegistrosContext } from "./registrosContext";
import type { RegistrosContextValue } from "./registrosContext";

export const useRegistros = (): RegistrosContextValue => {
  const ctx = useContext(RegistrosContext);
  if (!ctx) {
    throw new Error("useRegistros debe usarse dentro de RegistrosProvider");
  }
  return ctx;
};

