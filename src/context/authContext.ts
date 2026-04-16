import { createContext } from "react";
import type { Usuario } from "../types/usuario";

export type AuthUser = Pick<Usuario, "id" | "nombre" | "email" | "rol">;

export type LoginParams = {
  email: string;
  password: string;
};

export type AuthContextValue = {
  user: AuthUser | null;
  login: (params: LoginParams) => Promise<AuthUser>;
  loginMicrosoft: (token: string) => Promise<AuthUser>; // 👈 NUEVO
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

