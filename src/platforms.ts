export type EmpresaActiva = "beck" | "firemat" | "trager";

export type FirematLikeEmpresa = Extract<EmpresaActiva, "firemat" | "trager">;

export type PlataformaConfig = {
  slug: EmpresaActiva;
  nombre: string;
  crm: string;
  badge: string;
  logo: string;
  theme: "beck" | "firemat";
};

export const PLATAFORMAS: Record<EmpresaActiva, PlataformaConfig> = {
  beck: {
    slug: "beck",
    nombre: "BECK Soluciones",
    crm: "CRM BECK",
    badge: "Proteccion pasiva",
    logo: "/logo.png",
    theme: "beck",
  },
  firemat: {
    slug: "firemat",
    nombre: "Firemat",
    crm: "CRM FIREMAT",
    badge: "Inventario y ventas",
    logo: "/Firemat_logo.png",
    theme: "firemat",
  },
  trager: {
    slug: "trager",
    nombre: "Trager",
    crm: "CRM TRAGER",
    badge: "Inventario y ventas",
    logo: "/logo.png",
    theme: "firemat",
  },
};

export const isEmpresaActiva = (value: unknown): value is EmpresaActiva =>
  value === "beck" || value === "firemat" || value === "trager";

export const getEmpresaFromPath = (pathname: string): EmpresaActiva => {
  if (pathname.startsWith("/firemat")) return "firemat";
  if (pathname.startsWith("/trager")) return "trager";
  return "beck";
};

export const getFirematLikePath = (
  empresa: FirematLikeEmpresa,
  suffix: string
): string => `/${empresa}/${suffix.replace(/^\/+/, "")}`;

export const getEquivalentCompanyPath = (
  pathname: string,
  target: EmpresaActiva
): string => {
  const [, current, ...rest] = pathname.split("/");
  const suffix = rest.join("/");

  if (target === "beck") {
    const beckFallbacks: Record<string, string> = {
      dashboard: "dashboard",
      funnel: "funnel",
      cotizaciones: "cotizaciones",
      reportes: "reportes",
      movimientos: "movimientos",
      clientes: "clientes",
      "usuarios-parametros": "usuarios-parametros",
      permisos: "permisos",
    };
    return `/beck/${beckFallbacks[suffix] ?? "dashboard"}`;
  }

  if (current === "firemat" || current === "trager") {
    if (target === "trager" && !["dashboard", "funnel", "clientes"].includes(suffix)) {
      return "/trager/dashboard";
    }
    return `/${target}/${suffix || "dashboard"}`;
  }

  const firematFallbacks: Record<string, string> = {
    dashboard: "dashboard",
    funnel: "funnel",
    cotizaciones: "cotizaciones",
    reportes: "reportes",
    movimientos: "movimientos",
    clientes: "clientes",
    "usuarios-parametros": "usuarios-parametros",
    permisos: "permisos",
  };

  if (target === "trager" && !["dashboard", "funnel", "clientes"].includes(suffix)) {
    return "/trager/dashboard";
  }

  return `/${target}/${firematFallbacks[suffix] ?? "dashboard"}`;
};
