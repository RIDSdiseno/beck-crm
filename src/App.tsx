import React, { useEffect, useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Button, Layout, message } from "antd";

import Sidebar, {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  type RoleAccess,
} from "./components/Sidebar";
import SessionWatcher from "./components/SessionWatcher";
import AuthCallback from "./pages/AuthCallback";
import Login from "./pages/Login";

// Beck pages
import {
  BeckDashboard,
  BeckFunnel,
  BeckCotizaciones,
  BeckObras,
  BeckReportes,
  BeckMovimientos,
  BeckRegistro,
  BeckProcesamientoIngenieria,
  BeckOficinaTecnica,
  BeckUsuariosParametros,
  BeckClientes,
  BeckConfiguracionValidacion,
  BeckPermisos,
} from "./pages/beck";

// Firemat pages
import {
  FirematDashboard,
  FirematFunnel,
  FirematCotizaciones,
  FirematCategorias,
  FirematProductos,
  FirematInventario,
  FirematVentas,
  FirematReportes,
  FirematMovimientos,
  FirematUsuariosParametros,
  FirematClientes,
  FirematPermisos,
} from "./pages/firemat";
import {
  TragerClientes,
  TragerDashboard,
  TragerFunnel,
  TragerProximamente,
} from "./pages/trager";

import RegistrosMiEmpresa from "./pages/cliente/RegistrosMiEmpresa";
import ClienteItemizadoObra from "./pages/cliente/ItemizadoObra";
import type { ThemeMode } from "./hooks/useSystemTheme";
import { useAuth } from "./context/useAuth";
import { usePermisos } from "./hooks/usePermisos";
import type { RolUsuario } from "./types/usuario";
import { EMPRESA_STORAGE_KEY, type ModuloBeck } from "./services/api";
import { AlertasBeckBell, AlertasFirematBell } from "./components/AlertasBell";
import { getEmpresaFromPath, isEmpresaActiva } from "./platforms";

const { Content } = Layout;

const ALERTAS_BECK_ROLES: RolUsuario[] = [
  "Administrador",
  "Vendedor",
  "Ingenieria",
];

const ALERTAS_FIREMAT_ROLES: RolUsuario[] = [
  "Administrador",
  "VendedorFiremat",
];

const ACCESS_DENIED_PATH = "/access-denied";

const isCrmBlockedRole = (rol: RolUsuario): boolean => rol === "Terreno";

const NO_FIREMAT: Pick<RoleAccess,
  "firemat" | "firematDashboard" | "firematFunnel" | "firematCotizaciones" |
  "firematProductos" | "firematCategorias" | "firematInventario" |
  "firematKardex" | "firematVentas" | "firematReportes" | "firematMovimientos" |
  "firematClientes" | "clienteRegistros"
> = {
  firemat: false, firematDashboard: false, firematFunnel: false,
  firematCotizaciones: false, firematProductos: false, firematCategorias: false,
  firematInventario: false, firematKardex: false, firematVentas: false,
  firematReportes: false, firematMovimientos: false, firematClientes: false,
  clienteRegistros: false,
};

const NO_BECK: Pick<RoleAccess,
  "dashboard" | "funnel" | "registro" | "ingenieria" | "reportes" |
  "oficinaTecnica" | "cotizaciones" | "movimientos" | "obras" | "configuracion" | "clientes" |
  "clienteRegistros"
> = {
  dashboard: false, funnel: false, registro: false, ingenieria: false,
  oficinaTecnica: false, reportes: false, cotizaciones: false, movimientos: false, obras: false,
  configuracion: false, clientes: false, clienteRegistros: false,
};

const getRoleAccess = (rol: RolUsuario): RoleAccess => {
  switch (rol) {
    case "Administrador":
      return {
        dashboard: true, funnel: true, registro: true, ingenieria: true,
        oficinaTecnica: true, reportes: true, cotizaciones: true, movimientos: true, obras: true,
        configuracion: true, clientes: true,
        firemat: true, firematDashboard: true, firematFunnel: true,
        firematCotizaciones: true, firematProductos: true, firematCategorias: true,
        firematInventario: true, firematKardex: true, firematVentas: true,
        firematReportes: true, firematMovimientos: true, firematClientes: true,
        clienteRegistros: true,
      };
    case "Vendedor":
      return {
        dashboard: false, funnel: true, registro: false, ingenieria: false,
        oficinaTecnica: true, reportes: true, cotizaciones: true, movimientos: false, obras: false,
        configuracion: false, clientes: true, ...NO_FIREMAT,
      };
    case "Ingenieria":
      return {
        dashboard: false, funnel: true, registro: true, ingenieria: true,
        oficinaTecnica: true, reportes: true, cotizaciones: false, movimientos: false, obras: true,
        configuracion: true, clientes: true, ...NO_FIREMAT,
      };
    case "Visualizador":
      return {
        dashboard: false, funnel: true, registro: true, ingenieria: false,
        oficinaTecnica: true, reportes: true, cotizaciones: true, movimientos: false, obras: true,
        configuracion: false, clientes: true, ...NO_FIREMAT,
      };
    case "VendedorFiremat":
      return {
        ...NO_BECK,
        firemat: true, firematDashboard: true, firematFunnel: true,
        firematCotizaciones: true, firematProductos: true, firematCategorias: true,
        firematInventario: false, firematKardex: false,
        firematVentas: true, firematReportes: false, firematMovimientos: false,
        firematClientes: true,
      };
    case "Bodeguero":
      return {
        ...NO_BECK,
        firemat: true, firematDashboard: true, firematFunnel: false,
        firematCotizaciones: false, firematProductos: true, firematCategorias: true,
        firematInventario: true, firematKardex: true,
        firematVentas: false, firematReportes: false, firematMovimientos: true,
        firematClientes: false,
      };
    case "VisualizadorFiremat":
      return {
        ...NO_BECK,
        firemat: true, firematDashboard: true, firematFunnel: true,
        firematCotizaciones: true, firematProductos: true, firematCategorias: true,
        firematInventario: true, firematKardex: false,
        firematVentas: true, firematReportes: false, firematMovimientos: false,
        firematClientes: true,
      };
    case "JefeObra":
      return {
        dashboard: true, funnel: false, registro: true, ingenieria: false,
        oficinaTecnica: false, reportes: true, cotizaciones: false, movimientos: false, obras: true,
        configuracion: true, clientes: false, ...NO_FIREMAT,
      };
    case "Cliente":
      return { ...NO_BECK, ...NO_FIREMAT, clienteRegistros: true };
    case "Terreno":
    default:
      return { ...NO_BECK, ...NO_FIREMAT };
  }
};

const getHomeRouteForRole = (rol: RolUsuario): string => {
  if (isCrmBlockedRole(rol)) {
    return ACCESS_DENIED_PATH;
  }

  switch (rol) {
    case "Administrador": {
      const empresa =
        typeof window !== "undefined"
          ? window.localStorage.getItem(EMPRESA_STORAGE_KEY)
          : null;
      if (isEmpresaActiva(empresa) && empresa !== "beck") {
        return `/${empresa}/dashboard`;
      }
      return "/beck/dashboard";
    }
    case "Vendedor":
      return "/beck/funnel";
    case "Ingenieria":
      return "/beck/procesamiento-ingenieria";
    case "JefeObra":
      return "/beck/dashboard";
    case "VendedorFiremat":
    case "Bodeguero":
    case "VisualizadorFiremat":
      return "/firemat/dashboard";
    case "Cliente":
      return "/cliente/registros-mi-empresa";
    case "Visualizador":
    default:
      return "/beck/reportes";
  }
};

const canAccessPath = (pathname: string, access: RoleAccess): boolean => {
  if (["/" , "/login", "/auth/callback"].includes(pathname)) return true;
  if (pathname === ACCESS_DENIED_PATH) return true;

  // Legacy redirects — always passthrough (they redirect internally)
  if (
    pathname === "/dashboard" ||
    pathname === "/dashboard/funnel" ||
    pathname === "/registro" ||
    pathname === "/ingenieria" ||
    pathname === "/reportes" ||
    pathname === "/junta-espuma" ||
    pathname === "/cotizaciones" ||
    pathname === "/movimientos" ||
    pathname === "/obras" ||
    pathname === "/configuracion"
  ) {
    return true;
  }

  // Beck routes
  if (pathname === "/beck/dashboard") return access.dashboard;
  if (pathname === "/beck/funnel") return access.funnel;
  if (pathname === "/beck/registro") return access.registro;
  if (pathname === "/beck/procesamiento-ingenieria") return access.ingenieria;
  if (pathname === "/beck/oficina-tecnica") return access.oficinaTecnica;
  if (pathname === "/beck/reportes") return access.reportes;
  if (pathname === "/beck/cotizaciones") return access.cotizaciones;
  if (pathname === "/beck/movimientos") return access.movimientos;
  if (pathname === "/beck/obras") return access.obras;
  if (pathname === "/beck/clientes") return access.clientes;
  if (pathname === "/beck/usuarios-parametros") return access.configuracion;
  if (pathname === "/beck/permisos") return access.configuracion;
  if (pathname === "/beck/configuracion-campos-registro") return true;
  if (pathname === "/beck/itemizados-mandante") return true;
  if (pathname === "/beck/configuracion-validacion") return access.configuracion;

  if (pathname === "/firemat/dashboard") return access.firematDashboard;
  if (pathname === "/firemat/funnel") return access.firematFunnel;
  if (pathname === "/firemat/cotizaciones") return access.firematCotizaciones;
  if (pathname === "/firemat/productos") return access.firematProductos;
  if (pathname === "/firemat/inventario") return access.firematInventario;
  if (pathname === "/firemat/ventas") return access.firematVentas;
  if (pathname === "/firemat/movimientos") return access.firematMovimientos || access.firematKardex;
  if (pathname === "/firemat/clientes") return access.firematClientes;
  if (pathname === "/firemat/reportes") return access.firematReportes;
  if (pathname === "/firemat/usuarios-parametros") return access.firemat && access.configuracion;
  if (pathname.startsWith("/firemat/")) return access.firemat;

  if (pathname === "/trager/dashboard") return access.firematDashboard;
  if (pathname === "/trager/funnel") return access.firematFunnel;
  if (pathname === "/trager/clientes") return access.firematClientes;
  if (pathname.startsWith("/trager/")) return access.firemat;

  if (pathname === "/cliente/registros-mi-empresa") return access.clienteRegistros;
  if (pathname === "/cliente/itemizado-obra") return access.clienteRegistros;
  if (pathname.startsWith("/cliente/")) return access.clienteRegistros;

  return true;
};

const getLoginErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: { error?: string; message?: string };
      };
    };
    return (
      axiosError.response?.data?.error ||
      axiosError.response?.data?.message ||
      (axiosError.response?.status === 401
        ? "Usuario o contraseña inválidos"
        : "No se pudo iniciar sesión")
    );
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "No se pudo iniciar sesión";
};

const BECK_ROUTE_MODULO: Record<string, ModuloBeck> = {
  "/beck/dashboard": "beck_dashboard",
  "/beck/procesamiento-ingenieria": "beck_procesamiento_ingenieria",
  "/beck/oficina-tecnica": "beck_oficina_tecnica",
  "/beck/registro": "beck_registro",
  "/beck/reportes": "beck_reportes",
  "/beck/cotizaciones": "beck_cotizaciones",
  "/beck/movimientos": "beck_movimientos",
  "/beck/obras": "beck_obras",
  "/beck/funnel": "beck_funnel",
  "/beck/clientes": "beck_clientes",
  "/cliente/registros-mi-empresa": "beck_vista_cliente",
  "/cliente/itemizado-obra": "beck_vista_cliente",
  "/beck/usuarios-parametros": "beck_usuarios_parametros",
  "/beck/permisos": "beck_usuarios_parametros",
  "/beck/configuracion-validacion": "beck_reglas_validacion",
};

const FIREMAT_ROUTE_MODULO: Record<string, ModuloBeck> = {
  "/firemat/dashboard": "firemat_dashboard",
  "/firemat/funnel": "firemat_funnel",
  "/firemat/cotizaciones": "firemat_cotizaciones",
  "/firemat/clientes": "firemat_clientes",
  "/firemat/productos": "firemat_productos",
  "/firemat/categorias": "firemat_categorias",
  "/firemat/inventario": "firemat_inventario",
  "/firemat/ventas": "firemat_ventas",
  "/firemat/movimientos": "firemat_movimientos",
  "/firemat/reportes": "firemat_reportes",
  "/firemat/usuarios-parametros": "firemat_usuarios_parametros",
  "/firemat/permisos": "firemat_usuarios_parametros",
};

const TRAGER_ROUTE_MODULO: Record<string, ModuloBeck> = {
  "/trager/dashboard": "firemat_dashboard",
  "/trager/funnel": "firemat_funnel",
  "/trager/clientes": "firemat_clientes",
};

const PermisosFallback: React.FC = () => (
  <div className="flex min-h-[200px] items-center justify-center" aria-hidden="true">
    <div className="w-full max-w-3xl space-y-4 px-4">
      <div className="h-8 w-1/3 animate-pulse rounded-lg bg-black/5" />
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-black/5" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-black/5" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-black/5" />
      </div>
    </div>
  </div>
);

interface PermisosGateProps {
  modulo: ModuloBeck;
  homeRoute: string;
  permisosReady: boolean;
  children: React.ReactElement;
}

const PermisosGate: React.FC<PermisosGateProps> = ({
  modulo,
  homeRoute,
  permisosReady: pathValidated,
  children,
}) => {
  // permisosReady (context) = permisos loaded at least once (permisos !== null)
  // pathValidated (prop)    = permisosValidPath === location.pathname
  // Both must be true before we can evaluate canView; do NOT block on
  // refreshingPermisos — that would cause an infinite hang when the path-validation
  // effect resolves early (loadingRef guard) while a parallel fetch is still running.
  const { canView, permisosReady: permisosLoaded } = usePermisos();

  if (!pathValidated || !permisosLoaded) {
    return <PermisosFallback />;
  }

  if (!canView(modulo)) {
    return <Navigate to={homeRoute} replace />;
  }

  return children;
};

const AppShell: React.FC = () => {
  const themeMode: ThemeMode = "light";

  const [collapsed, setCollapsed] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();
  const { canView, refreshPermisos, permisosReady: permisosLoaded } = usePermisos();

  // Tracks the path for which permisos have been validated.
  // Initialized to the current path so initial page load shows content immediately.
  // On navigation, location.pathname differs from permisosValidPath until refresh completes,
  // which is what PermisosGate uses to show the fallback and prevent the flash.
  // Path for which permisos have been validated. Differs from location.pathname
  // during navigation, causing PermisosGate to show a fallback instead of the page.
  const [permisosValidPath, setPermisosValidPath] = useState(location.pathname);

  const access = useMemo(
    () => (user ? getRoleAccess(user.rol) : null),
    [user]
  );
  const homeRoute = useMemo(() => {
    if (!user) return "/login";
    if (isCrmBlockedRole(user.rol)) return ACCESS_DENIED_PATH;

    // Admin and Cliente keep static routing
    if (user.rol === "Administrador" || user.rol === "Cliente") {
      return getHomeRouteForRole(user.rol);
    }

    // All other roles: fall back to static until permisos load
    if (!permisosLoaded) return getHomeRouteForRole(user.rol);

    const isFirematRole =
      user.rol === "VendedorFiremat" ||
      user.rol === "Bodeguero" ||
      user.rol === "VisualizadorFiremat";

    if (isFirematRole) {
      const FIREMAT_HOME_ORDER: Array<{ route: string; modulo: ModuloBeck }> = [
        { route: "/firemat/dashboard", modulo: "firemat_dashboard" },
        { route: "/firemat/funnel", modulo: "firemat_funnel" },
        { route: "/firemat/cotizaciones", modulo: "firemat_cotizaciones" },
        { route: "/firemat/clientes", modulo: "firemat_clientes" },
        { route: "/firemat/productos", modulo: "firemat_productos" },
        { route: "/firemat/categorias", modulo: "firemat_categorias" },
        { route: "/firemat/inventario", modulo: "firemat_inventario" },
        { route: "/firemat/ventas", modulo: "firemat_ventas" },
        { route: "/firemat/movimientos", modulo: "firemat_movimientos" },
        { route: "/firemat/reportes", modulo: "firemat_reportes" },
        { route: "/firemat/usuarios-parametros", modulo: "firemat_usuarios_parametros" },
      ];
      for (const { route, modulo } of FIREMAT_HOME_ORDER) {
        if (canView(modulo)) return route;
      }
      return "/login";
    }

    // Beck roles: find first accessible module
    const BECK_HOME_ORDER: Array<{ route: string; modulo: ModuloBeck }> = [
      { route: "/beck/dashboard", modulo: "beck_dashboard" },
      { route: "/beck/procesamiento-ingenieria", modulo: "beck_procesamiento_ingenieria" },
      { route: "/beck/registro", modulo: "beck_registro" },
      { route: "/beck/obras", modulo: "beck_obras" },
      { route: "/beck/funnel", modulo: "beck_funnel" },
      { route: "/beck/cotizaciones", modulo: "beck_cotizaciones" },
      { route: "/beck/clientes", modulo: "beck_clientes" },
      { route: "/cliente/registros-mi-empresa", modulo: "beck_vista_cliente" },
      { route: "/beck/movimientos", modulo: "beck_movimientos" },
      { route: "/beck/reportes", modulo: "beck_reportes" },
      { route: "/beck/usuarios-parametros", modulo: "beck_usuarios_parametros" },
    ];
    for (const { route, modulo } of BECK_HOME_ORDER) {
      if (canView(modulo)) return route;
    }

    return "/login";
  }, [user, permisosLoaded, canView]);

  const activeEmpresa = getEmpresaFromPath(location.pathname);
  const isFirematLike = activeEmpresa === "firemat" || activeEmpresa === "trager";
  const themeClass = isFirematLike ? "theme-firemat" : "theme-beck";

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (
      !user &&
      location.pathname !== "/login" &&
      location.pathname !== "/auth/callback"
    ) {
      navigate("/login", { replace: true });
      return;
    }
    if (user && location.pathname === "/login") {
      navigate(homeRoute, { replace: true });
    }
  }, [homeRoute, location.pathname, navigate, user]);

  useEffect(() => {
    if (!user || !access) return;
    const beckModulo = BECK_ROUTE_MODULO[location.pathname];
    if (beckModulo) {
      if (!canView(beckModulo)) {
        navigate(homeRoute, { replace: true });
        return;
      }
      // /beck/permisos is Admin-only regardless of canView("beck_usuarios_parametros")
      if (location.pathname === "/beck/permisos" && user.rol !== "Administrador") {
        navigate(homeRoute, { replace: true });
        return;
      }
      return;
    }
    const firematModulo = FIREMAT_ROUTE_MODULO[location.pathname];
    if (firematModulo) {
      if (!canView(firematModulo)) {
        navigate(homeRoute, { replace: true });
      }
      return;
    }
    const tragerModulo = TRAGER_ROUTE_MODULO[location.pathname];
    if (tragerModulo) {
      if (!canView(tragerModulo)) {
        navigate(homeRoute, { replace: true });
      }
      return;
    }
    // For remaining routes (Cliente, legacy), use role-based access.
    if (!canAccessPath(location.pathname, access)) {
      navigate(homeRoute, { replace: true });
    }
  }, [access, homeRoute, location.pathname, navigate, user, canView]);

  useEffect(() => {
    const currentPath = location.pathname;
    // cancelled is set to true by the cleanup when this effect re-runs (new path/user),
    // preventing a stale async IIFE from overwriting permisosValidPath with an old path.
    let cancelled = false;

    console.log("refresh permisos start", currentPath);
    console.log("permisosValidPath", permisosValidPath);
    console.log("pathname", location.pathname);

    if (!user) {
      // No user: mark path as validated immediately so the gate never hangs.
      setPermisosValidPath(currentPath);
      return;
    }

    void (async () => {
      try {
        await refreshPermisos();
      } catch (error) {
        console.error("Error refrescando permisos", error);
      } finally {
        console.log("refresh permisos finally", currentPath);
        // Only update if this effect instance is still the latest one.
        if (!cancelled) {
          setPermisosValidPath(currentPath);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user?.id]);

  const isLoginRoute = location.pathname === "/login";
  const currentSidebarWidth = collapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : SIDEBAR_WIDTH_EXPANDED;

  const handleLogin = async (values: { email: string; password: string }) => {
    try {
      const authUser = await login(values);
      navigate(getHomeRouteForRole(authUser.rol), { replace: true });
    } catch (error: unknown) {
      message.error(getLoginErrorMessage(error));
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const deniedScreen = (
    <div className="flex min-h-screen items-center justify-center bg-beck-bg-light px-4 text-beck-ink">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Acceso denegado</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tu usuario no tiene acceso al CRM web.
        </p>
        <Button type="primary" className="mt-5" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );

  if (!user || !access) {
    return (
      <>
        <SessionWatcher />
        <Routes>
          <Route
            path="/login"
            element={<Login themeMode={themeMode} onLogin={handleLogin} />}
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </>
    );
  }

  if (isLoginRoute) {
    return <Navigate to={homeRoute} replace />;
  }

  if (isCrmBlockedRole(user.rol)) {
    return (
      <>
        <SessionWatcher />
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={deniedScreen} />
        </Routes>
      </>
    );
  }

  // firematRoute kept only for configuracion-validacion which has no dedicated PermisosGate modulo
  const firematRoute = (flag: boolean, element: React.ReactElement) =>
    flag ? element : <Navigate to={homeRoute} replace />;

  const permisosReady = permisosValidPath === location.pathname;

  const canSeeBeck = !!user && ALERTAS_BECK_ROLES.includes(user.rol);
  const canSeeFiremat = !!user && ALERTAS_FIREMAT_ROLES.includes(user.rol);

  const inFiremat = location.pathname.startsWith("/firemat");
  const inTrager = location.pathname.startsWith("/trager");
  const inBeck = location.pathname.startsWith("/beck");
  const inCliente = location.pathname.startsWith("/cliente");

  const showBeckBell = canSeeBeck && !inFiremat && !inTrager;
  const showFirematBell = canSeeFiremat && inFiremat && !inBeck && !inCliente;

  // En los Funnels la campana va embebida en el header de la página (pasada como prop).
  // En el resto de páginas del módulo se muestra en un strip no-fixed en el Content.
  const bellBeck = showBeckBell ? <AlertasBeckBell /> : null;
  const bellFiremat = showFirematBell ? <AlertasFirematBell /> : null;

  const onFunnelRoute =
    location.pathname === "/beck/funnel" ||
    location.pathname === "/firemat/funnel" ||
    location.pathname === "/trager/funnel";

  const bellStrip =
    !onFunnelRoute && (bellBeck || bellFiremat) ? (
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {bellBeck}
        {bellFiremat}
      </div>
    ) : null;

  return (
    <>
      <SessionWatcher />
      <Layout
        className={`${themeClass} bg-beck-bg-light text-beck-ink`}
        style={{ minHeight: "100vh", overflowX: "hidden" }}
      >
        {isMobile && collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="fixed top-3 left-3 z-50 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow"
          >
            Menu
          </button>
        )}

        <Sidebar
          themeMode={themeMode}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          hiddenOnMobile={isMobile && collapsed}
          user={user}
          access={access}
          onLogout={handleLogout}
        />

        <Layout
          style={{
            marginLeft: isMobile ? 0 : currentSidebarWidth,
            transition: "margin-left 0.2s ease",
            minHeight: "100vh",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <Content
            className={isFirematLike ? "bg-firemat-bg" : "bg-beck-bg-light"}
            style={{
              padding: "12px 12px",
              paddingTop: isMobile && collapsed ? 56 : 12,
            }}
          >
            {bellStrip}
            <div className="w-full min-w-0">
              <Routes>
                <Route path="/auth/callback" element={<AuthCallback />} />

                {/* Root: redirect based on session */}
                <Route path="/" element={<Navigate to={homeRoute} replace />} />

                {/* Legacy redirects (backward compatibility) */}
                <Route path="/dashboard" element={<Navigate to="/beck/dashboard" replace />} />
                <Route path="/dashboard/funnel" element={<Navigate to="/beck/funnel" replace />} />
                <Route path="/registro" element={<Navigate to="/beck/registro" replace />} />
                <Route path="/ingenieria" element={<Navigate to="/beck/procesamiento-ingenieria" replace />} />
                <Route path="/reportes" element={<Navigate to="/beck/reportes" replace />} />
                <Route path="/cotizaciones" element={<Navigate to="/beck/cotizaciones" replace />} />
                <Route path="/movimientos" element={<Navigate to="/beck/movimientos" replace />} />
                <Route path="/obras" element={<Navigate to="/beck/obras" replace />} />
                <Route path="/configuracion" element={<Navigate to="/beck/usuarios-parametros" replace />} />

                {/* ── Beck routes ─────────────────────────────── */}
                {/* Beck routes: PermisosGate is the sole authority via canView.
                    Removing the outer access.xxx guard allows individual permission
                    exceptions to override role defaults (e.g. Ingeniería + cotizaciones). */}
                <Route
                  path="/beck/dashboard"
                  element={
                    <PermisosGate modulo="beck_dashboard" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <BeckDashboard themeMode={themeMode} />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/beck/funnel"
                  element={
                    <PermisosGate modulo="beck_funnel" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <BeckFunnel themeMode={themeMode} alertaBell={bellBeck} />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/beck/cotizaciones"
                  element={
                    <PermisosGate modulo="beck_cotizaciones" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <BeckCotizaciones themeMode={themeMode} />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/beck/obras"
                  element={
                    <PermisosGate modulo="beck_obras" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <BeckObras />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/beck/reportes"
                  element={
                    <PermisosGate modulo="beck_reportes" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <BeckReportes themeMode={themeMode} />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/beck/movimientos"
                  element={
                    <PermisosGate modulo="beck_movimientos" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <BeckMovimientos />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/beck/registro"
                  element={
                    <PermisosGate modulo="beck_registro" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <BeckRegistro themeMode={themeMode} />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/beck/procesamiento-ingenieria"
                  element={
                    <PermisosGate modulo="beck_procesamiento_ingenieria" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <BeckProcesamientoIngenieria themeMode={themeMode} />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/beck/oficina-tecnica"
                  element={
                    <PermisosGate modulo="beck_oficina_tecnica" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <BeckOficinaTecnica />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/beck/clientes"
                  element={
                    <PermisosGate modulo="beck_clientes" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <BeckClientes />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/beck/usuarios-parametros"
                  element={
                    <PermisosGate modulo="beck_usuarios_parametros" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <BeckUsuariosParametros themeMode={themeMode} />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/beck/configuracion-validacion"
                  element={
                    <PermisosGate modulo="beck_reglas_validacion" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <BeckConfiguracionValidacion />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/beck/permisos"
                  element={
                    user.rol !== "Administrador" ? (
                      <Navigate to={homeRoute} replace />
                    ) : (
                      <PermisosGate modulo="beck_usuarios_parametros" homeRoute={homeRoute} permisosReady={permisosReady}>
                        <BeckPermisos />
                      </PermisosGate>
                    )
                  }
                />

                {/* ── Firemat routes ──────────────────────────── */}
                <Route
                  path="/beck/configuracion-campos-registro"
                  element={<Navigate to="/beck/obras" replace />}
                />
                <Route
                  path="/beck/itemizados-mandante"
                  element={<Navigate to="/beck/obras" replace />}
                />

                <Route
                  path="/firemat/dashboard"
                  element={
                    <PermisosGate modulo="firemat_dashboard" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <FirematDashboard />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/firemat/funnel"
                  element={
                    <PermisosGate modulo="firemat_funnel" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <FirematFunnel alertaBell={bellFiremat} />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/firemat/cotizaciones"
                  element={
                    <PermisosGate modulo="firemat_cotizaciones" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <FirematCotizaciones />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/firemat/clientes"
                  element={
                    <PermisosGate modulo="firemat_clientes" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <FirematClientes />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/firemat/productos"
                  element={
                    <PermisosGate modulo="firemat_productos" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <FirematProductos />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/firemat/categorias"
                  element={
                    <PermisosGate modulo="firemat_categorias" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <FirematCategorias />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/firemat/inventario"
                  element={
                    <PermisosGate modulo="firemat_inventario" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <FirematInventario />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/firemat/ventas"
                  element={
                    <PermisosGate modulo="firemat_ventas" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <FirematVentas />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/firemat/movimientos"
                  element={
                    <PermisosGate modulo="firemat_movimientos" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <FirematMovimientos />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/firemat/reportes"
                  element={
                    <PermisosGate modulo="firemat_reportes" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <FirematReportes />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/firemat/usuarios-parametros"
                  element={
                    <PermisosGate modulo="firemat_usuarios_parametros" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <FirematUsuariosParametros />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/firemat/permisos"
                  element={
                    <PermisosGate modulo="firemat_usuarios_parametros" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <FirematPermisos />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/firemat/configuracion-validacion"
                  element={firematRoute(access.firemat && access.configuracion, <BeckConfiguracionValidacion />)}
                />

                {/* ── Cliente routes ──────────────────────────── */}
                {/* Trager routes: frontend-only modules, no Firemat services */}
                <Route
                  path="/trager/dashboard"
                  element={
                    <PermisosGate modulo="firemat_dashboard" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <TragerDashboard />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/trager/funnel"
                  element={
                    <PermisosGate modulo="firemat_funnel" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <TragerFunnel />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/trager/clientes"
                  element={
                    <PermisosGate modulo="firemat_clientes" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <TragerClientes />
                    </PermisosGate>
                  }
                />
                <Route path="/trager/*" element={<TragerProximamente />} />

                <Route
                  path="/cliente/registros-mi-empresa"
                  element={
                    <PermisosGate modulo="beck_vista_cliente" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <RegistrosMiEmpresa />
                    </PermisosGate>
                  }
                />
                <Route
                  path="/cliente/itemizado-obra"
                  element={
                    <PermisosGate modulo="beck_vista_cliente" homeRoute={homeRoute} permisosReady={permisosReady}>
                      <ClienteItemizadoObra />
                    </PermisosGate>
                  }
                />

                <Route path="*" element={<Navigate to={homeRoute} replace />} />
              </Routes>
            </div>
          </Content>
        </Layout>
      </Layout>
    </>
  );
};

const App: React.FC = () => <AppShell />;

export default App;
