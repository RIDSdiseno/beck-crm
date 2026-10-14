import { clientesFirematAPI, clientesTragerAPI, type ClienteFiremat, type ClienteTrager, type ContactoClienteFiremat, type ContactoClienteTrager } from './api';

// El formulario es compartido; cada plataforma conserva su API y sus propios datos.
type ClientesComercialesApi = Omit<typeof clientesFirematAPI, 'buscar' | 'oportunidades'> & {
  oportunidades?: (clienteId: string) => Promise<unknown[]>;
};
const contactoVista = (contacto: ContactoClienteTrager): ContactoClienteFiremat => ({ ...contacto, id: String(contacto.id), clienteId: String(contacto.clienteId) });
const clienteVista = (cliente: ClienteTrager): ClienteFiremat => ({ ...cliente, id: String(cliente.id), contactos: cliente.contactos?.map(contactoVista) });
export const clientesTragerVistaAPI: ClientesComercialesApi = {
  listar: async params => (await clientesTragerAPI.listar(params)).map(clienteVista),
  obtener: async id => clienteVista(await clientesTragerAPI.obtener(Number(id))),
  crear: async payload => clienteVista(await clientesTragerAPI.crear(payload)),
  actualizar: async (id, payload) => clienteVista(await clientesTragerAPI.actualizar(Number(id), payload)),
  toggleEstado: async (id, activo) => clienteVista(await clientesTragerAPI.toggleEstado(Number(id), activo)),
  agregarContacto: async (id, payload) => contactoVista(await clientesTragerAPI.agregarContacto(Number(id), payload)),
  actualizarContacto: async (id, payload) => contactoVista(await clientesTragerAPI.actualizarContacto(Number(id), payload)),
  toggleEstadoContacto: async (id, activo) => contactoVista(await clientesTragerAPI.toggleEstadoContacto(Number(id), activo)),
  importar: clientesTragerAPI.importar,
};
export const clientesFirematVistaAPI: ClientesComercialesApi = clientesFirematAPI;
