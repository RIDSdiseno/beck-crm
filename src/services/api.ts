import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("beck_token");

    if (token) {
      const headers =
        config.headers instanceof AxiosHeaders
          ? config.headers
          : new AxiosHeaders(config.headers);

      headers.set("Authorization", `Bearer ${token}`);
      config.headers = headers;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const data = error.response?.data as { error?: string } | undefined;
    const message = data?.error;

    if (
      status === 401 ||
      (status === 403 && message === "Usuario desactivado")
    ) {
      localStorage.removeItem("beck_token");
      localStorage.removeItem("beck_crm_session_v1");

      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/auth/callback"
      ) {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    rol:
      | "administrador"
      | "vendedor"
      | "terreno"
      | "ingenieria"
      | "visualizador";
  };
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  me: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};

export interface RegistroTerrenoInput {
  obra_id: string;
  descripcion_material: string;
  modulo: string;
  piso: string;
  eje_numerico: number;
  eje_alfabetico: string;
  numero_sello: string;
  cantidad_sellos: number;
  nombre_sellador: string;
  holgura: 1 | 1.2 | 1.4 | 1.8;
  accesibilidad: 1 | 2 | 3;
  observaciones?: string;
}

export interface RegistroTerreno extends RegistroTerrenoInput {
  id: string;
  usuario_id: string;
  fecha: string;
  dia_semana: string;
  fotos_urls: string[];
  procesado: boolean;
  created_at: string;
  updated_at: string;
}

export const registrosTerrenoAPI = {
  crear: async (
    data: RegistroTerrenoInput,
    fotos: File[]
  ): Promise<RegistroTerreno> => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    fotos.forEach((foto) => {
      formData.append("fotos", foto);
    });

    const response = await api.post<RegistroTerreno>(
      "/registros-terreno",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  listar: async (params?: { procesado?: boolean; obra_id?: string }) => {
    const response = await api.get<RegistroTerreno[]>("/registros-terreno", {
      params,
    });
    return response.data;
  },

  obtenerPorId: async (id: string) => {
    const response = await api.get<RegistroTerreno>(`/registros-terreno/${id}`);
    return response.data;
  },

  pendientes: async () => {
    const response = await api.get<RegistroTerreno[]>(
      "/registros-terreno/pendientes"
    );
    return response.data;
  },
};

export interface ProcesamientoInput {
  registro_terreno_id: string;
  codigo: string;
  itemizado_id: string;
  notas?: string;
}

export interface Procesamiento extends ProcesamientoInput {
  id: string;
  usuario_id: string;
  total_sellos_calculado: number;
  created_at: string;
  updated_at: string;
}

export const procesamientoAPI = {
  procesar: async (data: ProcesamientoInput): Promise<Procesamiento> => {
    const response = await api.post<Procesamiento>("/procesamiento", data);
    return response.data;
  },

  listar: async (params?: { registro_terreno_id?: string }) => {
    const response = await api.get<Procesamiento[]>("/procesamiento", {
      params,
    });
    return response.data;
  },
};

export interface Notificacion {
  id: string;
  usuario_id: string;
  tipo: "nuevo_registro" | "procesado" | "sistema";
  mensaje: string;
  referencia_id?: string;
  leido: boolean;
  created_at: string;
}

export const notificacionesAPI = {
  listar: async (params?: { leido?: boolean }) => {
    const response = await api.get<Notificacion[]>("/notificaciones", {
      params,
    });
    return response.data;
  },

  marcarLeida: async (id: string) => {
    const response = await api.put(`/notificaciones/${id}/leer`);
    return response.data;
  },

  marcarTodasLeidas: async () => {
    const response = await api.put("/notificaciones/leer-todas");
    return response.data;
  },

  noLeidas: async () => {
    const response = await api.get<number>("/notificaciones/no-leidas");
    return response.data;
  },
};

export interface Obra {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  cliente: string;
  activa: boolean;
  fecha_inicio?: string;
  fecha_termino?: string;
  created_at: string;
  updated_at: string;
}

export const obrasAPI = {
  listar: async (params?: { activa?: boolean }) => {
    const response = await api.get<Obra[]>("/obras", { params });
    return response.data;
  },

  obtenerPorId: async (id: string) => {
    const response = await api.get<Obra>(`/obras/${id}`);
    return response.data;
  },

  crear: async (data: Omit<Obra, "id" | "created_at" | "updated_at">) => {
    const response = await api.post<Obra>("/obras", data);
    return response.data;
  },

  actualizar: async (
    id: string,
    data: Partial<Omit<Obra, "id" | "created_at" | "updated_at">>
  ) => {
    const response = await api.put<Obra>(`/obras/${id}`, data);
    return response.data;
  },

  eliminar: async (id: string) => {
    const response = await api.delete(`/obras/${id}`);
    return response.data;
  },
};

export interface Itemizado {
  id: string;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  precio_unitario: number;
  categoria: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export const itemizadosAPI = {
  listar: async (params?: { activo?: boolean; categoria?: string }) => {
    const response = await api.get<Itemizado[]>("/itemizados", { params });
    return response.data;
  },

  obtenerPorId: async (id: string) => {
    const response = await api.get<Itemizado>(`/itemizados/${id}`);
    return response.data;
  },

  crear: async (
    data: Omit<Itemizado, "id" | "created_at" | "updated_at">
  ) => {
    const response = await api.post<Itemizado>("/itemizados", data);
    return response.data;
  },

  actualizar: async (
    id: string,
    data: Partial<Omit<Itemizado, "id" | "created_at" | "updated_at">>
  ) => {
    const response = await api.put<Itemizado>(`/itemizados/${id}`, data);
    return response.data;
  },

  eliminar: async (id: string) => {
    const response = await api.delete(`/itemizados/${id}`);
    return response.data;
  },
};

export type UsuarioApiRol =
  | "administrador"
  | "vendedor"
  | "terreno"
  | "ingenieria"
  | "visualizador";

export interface UsuarioApi {
  id: string;
  nombre: string;
  email: string;
  rol: UsuarioApiRol;
  activo: boolean;
  azureId: string | null;
  createdAt: string;
}

export interface ActualizarUsuarioInput {
  nombre?: string;
  email?: string;
  rol?: UsuarioApiRol;
  activo?: boolean;
}

export interface EliminarUsuarioResponse {
  message: string;
}

export const usuariosAPI = {
  listar: async () => {
    const response = await api.get<UsuarioApi[]>("/usuarios");
    return response.data;
  },

  actualizar: async (id: string, data: ActualizarUsuarioInput) => {
    const response = await api.put<UsuarioApi>(`/usuarios/${id}`, data);
    return response.data;
  },

  eliminar: async (id: string) => {
    const response = await api.delete<EliminarUsuarioResponse>(`/usuarios/${id}`);
    return response.data;
  },
};

export interface DashboardStats {
  totalRegistros: number;
  registrosProcesados: number;
  registrosPendientes: number;
  totalSellos: number;
  sellosPonderados: number;
  obrasActivas: number;
  registrosHoy: number;
  obrasPorRegistros: {
    obraId: string;
    nombre: string;
    codigo: string;
    registros: number;
  }[];
}

export const statsAPI = {
  dashboard: async () => {
    const response = await api.get<DashboardStats>("/stats/dashboard");
    return response.data;
  },

  obras: async () => {
    const response = await api.get("/stats/obras");
    return response.data;
  },
};

export default api;
