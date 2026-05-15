import React from "react";
import type { ThemeMode } from "../../hooks/useSystemTheme";
import UsuariosParametrosUI from "../../components/UsuariosParametrosUI";
import type { UsuarioApiRol } from "../../services/api";

type Props = { themeMode: ThemeMode };

const ROLES_BECK: Array<{ label: string; value: UsuarioApiRol }> = [
  { label: "Administrador", value: "administrador" },
  { label: "Vendedor", value: "vendedor" },
  { label: "Terreno", value: "terreno" },
  { label: "Ingeniería", value: "ingenieria" },
  { label: "Jefe de obra", value: "jefeobra" },
  { label: "Visualizador", value: "visualizador" },
];

const BeckUsuariosParametros: React.FC<Props> = ({ themeMode }) => {
  void themeMode;
  return (
    <UsuariosParametrosUI
      empresa="beck"
      rolesDisponibles={ROLES_BECK}
      defaultRol="terreno"
      titulo="Usuarios y roles"
      subtitulo="Gestiona usuarios reales del CRM."
      labelCrear="Crear usuario"
    />
  );
};

export default BeckUsuariosParametros;
