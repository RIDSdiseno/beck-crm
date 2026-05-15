import React from "react";
import UsuariosParametrosUI from "../../components/UsuariosParametrosUI";
import type { UsuarioApiRol } from "../../services/api";

const ROLES_FIREMAT: Array<{ label: string; value: UsuarioApiRol }> = [
  { label: "Vendedor Firemat", value: "vendedor_firemat" },
  { label: "Bodeguero", value: "bodeguero" },
  { label: "Visualizador Firemat", value: "visualizador_firemat" },
];

const FirematUsuariosParametros: React.FC = () => (
  <UsuariosParametrosUI
    empresa="firemat"
    rolesDisponibles={ROLES_FIREMAT}
    defaultRol="vendedor_firemat"
    titulo="Usuarios y roles Firemat"
    subtitulo="Gestiona usuarios, roles y accesos de Firemat."
    labelCrear="Crear usuario Firemat"
  />
);

export default FirematUsuariosParametros;
