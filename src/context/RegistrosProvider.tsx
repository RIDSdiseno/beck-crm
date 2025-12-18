import React, {
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mockRegistrosSellos } from "../data/mockRegistrosSellos";
import type { RegistroSello } from "../types/registroSello";
import { RegistrosContext } from "./registrosContext";

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
