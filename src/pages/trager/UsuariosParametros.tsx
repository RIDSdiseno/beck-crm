import React from "react";
import UsuariosParametrosUI from "../../components/UsuariosParametrosUI";
import { ROLES_TRAGER } from "../../constants/roles";

// Usuarios y roles de Trager: misma pantalla que Firemat, con los roles propios de Trager.
const TragerUsuariosParametros: React.FC = () => (
  <UsuariosParametrosUI
    empresa="trager"
    rolesDisponibles={ROLES_TRAGER}
    defaultRol="vendedor_trager"
    titulo="Usuarios y roles Trager"
    subtitulo="Gestiona usuarios, roles y accesos de Trager."
    labelCrear="Crear usuario Trager"
  />
);

export default TragerUsuariosParametros;
