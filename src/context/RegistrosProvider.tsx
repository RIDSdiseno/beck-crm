import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mockRegistrosSellos } from "../data/mockRegistrosSellos";
import type { RegistroSello } from "../types/registroSello";

type RegistrosContextValue = {
  data: RegistroSello[];
  setData: React.Dispatch<React.SetStateAction<RegistroSello[]>>;
};

const RegistrosContext = createContext<RegistrosContextValue | undefined>(
  undefined
);

type RegistrosProviderProps = {
  children: ReactNode;
  initialData?: RegistroSello[];
};

export const RegistrosProvider: React.FC<RegistrosProviderProps> = ({
  children,
  initialData,
}) => {
  const [data, setData] = useState<RegistroSello[]>(
    initialData ?? mockRegistrosSellos
  );

  const value = useMemo(() => ({ data, setData }), [data]);

  return (
    <RegistrosContext.Provider value={value}>
      {children}
    </RegistrosContext.Provider>
  );
};

export const useRegistros = (): RegistrosContextValue => {
  const ctx = useContext(RegistrosContext);
  if (!ctx) {
    throw new Error("useRegistros debe usarse dentro de RegistrosProvider");
  }
  return ctx;
};
