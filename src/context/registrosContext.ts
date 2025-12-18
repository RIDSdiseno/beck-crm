import { createContext } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { RegistroSello } from "../types/registroSello";

export type RegistrosContextValue = {
  data: RegistroSello[];
  setData: Dispatch<SetStateAction<RegistroSello[]>>;
};

export const RegistrosContext = createContext<RegistrosContextValue | undefined>(
  undefined
);

