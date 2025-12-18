import { useContext } from "react";
import { AuthContext } from "./authContext";
import type { AuthContextValue } from "./authContext";

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
};

