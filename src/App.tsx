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
} from "./pages/beck";

// Firemat pages
import {
  FirematDashboard,
  FirematFunnel,
  FirematCotizaciones,
  FirematProductos,
  FirematInventario,
  FirematVentas,
  FirematReportes,
  FirematMovimientos,
  FirematUsuariosParametros,
  FirematClientes,
} from "./pages/firemat";

import type { ThemeMode } from "./hooks/useSystemTheme";
import { useAuth } from "./context/useAuth";
import type { RolUsuario } from "./types/usuario";
import { EMPRESA_STORAGE_KEY } from "./services/api";
import { AlertasBeckBell, AlertasFirematBell } from "./components/AlertasBell";

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
  "firematClientes"
> = {
  firemat: false, firematDashboard: false, firematFunnel: false,
  firematCotizaciones: false, firematProductos: false, firematCategorias: false,
  firematInventario: false, firematKardex: false, firematVentas: false,
  firematReportes: false, firematMovimientos: false, firematClientes: false,
};

const NO_BECK: Pick<RoleAccess,
  "dashboard" | "funnel" | "registro" | "ingenieria" | "reportes" |
  "oficinaTecnica" | "cotizaciones" | "movimientos" | "obras" | "configuracion" | "clientes"
> = {
  dashboard: false, funnel: false, registro: false, ingenieria: false,
  oficinaTecnica: false, reportes: false, cotizaciones: false, movimientos: false, obras: false,
  configuracion: false, clientes: false,
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
      return empresa === "firemat" ? "/firemat/dashboard" : "/beck/dashboard";
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

  const access = useMemo(
    () => (user ? getRoleAccess(user.rol) : null),
    [user]
  );
  const homeRoute = user ? getHomeRouteForRole(user.rol) : "/login";

  const isFiremat = location.pathname.startsWith("/firemat");
  const themeClass = isFiremat ? "theme-firemat" : "theme-beck";

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
    if (!canAccessPath(location.pathname, access)) {
      navigate(homeRoute, { replace: true });
    }
  }, [access, homeRoute, location.pathname, navigate, user]);

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

  const firematRoute = (flag: boolean, element: React.ReactElement) =>
    flag ? element : <Navigate to={homeRoute} replace />;

  const canSeeBeck = !!user && ALERTAS_BECK_ROLES.includes(user.rol);
  const canSeeFiremat = !!user && ALERTAS_FIREMAT_ROLES.includes(user.rol);

  const inFiremat = location.pathname.startsWith("/firemat");
  const inBeck = location.pathname.startsWith("/beck");

  const showBeckBell = canSeeBeck && !inFiremat;
  const showFirematBell = canSeeFiremat && !inBeck;

  // En los Funnels la campana va embebida en el header de la página (pasada como prop).
  // En el resto de páginas del módulo se muestra en un strip no-fixed en el Content.
  const bellBeck = showBeckBell ? <AlertasBeckBell /> : null;
  const bellFiremat = showFirematBell ? <AlertasFirematBell /> : null;

  const onFunnelRoute =
    location.pathname === "/beck/funnel" ||
    location.pathname === "/firemat/funnel";

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
            className={isFiremat ? "bg-firemat-bg" : "bg-beck-bg-light"}
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
                <Route
                  path="/beck/dashboard"
                  element={
                    access.dashboard ? (
                      <BeckDashboard themeMode={themeMode} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/beck/funnel"
                  element={
                    access.funnel ? (
                      <BeckFunnel themeMode={themeMode} alertaBell={bellBeck} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/beck/cotizaciones"
                  element={
                    access.cotizaciones ? (
                      <BeckCotizaciones themeMode={themeMode} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/beck/obras"
                  element={
                    access.obras ? (
                      <BeckObras />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/beck/reportes"
                  element={
                    access.reportes ? (
                      <BeckReportes themeMode={themeMode} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/beck/movimientos"
                  element={
                    access.movimientos ? (
                      <BeckMovimientos />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/beck/registro"
                  element={
                    access.registro ? (
                      <BeckRegistro themeMode={themeMode} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/beck/procesamiento-ingenieria"
                  element={
                    access.ingenieria ? (
                      <BeckProcesamientoIngenieria themeMode={themeMode} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/beck/oficina-tecnica"
                  element={
                    access.oficinaTecnica ? (
                      <BeckOficinaTecnica />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/beck/clientes"
                  element={
                    access.clientes ? (
                      <BeckClientes />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/beck/usuarios-parametros"
                  element={
                    access.configuracion ? (
                      <BeckUsuariosParametros themeMode={themeMode} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/beck/configuracion-validacion"
                  element={
                    access.configuracion ? (
                      <BeckConfiguracionValidacion />
                    ) : (
                      <Navigate to={homeRoute} replace />
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

                <Route path="/firemat/dashboard" element={firematRoute(access.firematDashboard, <FirematDashboard />)} />
                <Route path="/firemat/funnel" element={firematRoute(access.firematFunnel, <FirematFunnel alertaBell={bellFiremat} />)} />
                <Route path="/firemat/cotizaciones" element={firematRoute(access.firematCotizaciones, <FirematCotizaciones />)} />
                <Route path="/firemat/productos" element={firematRoute(access.firematProductos, <FirematProductos />)} />
                <Route path="/firemat/inventario" element={firematRoute(access.firematInventario, <FirematInventario />)} />
                <Route path="/firemat/ventas" element={firematRoute(access.firematVentas, <FirematVentas />)} />
                <Route path="/firemat/clientes" element={firematRoute(access.firematClientes, <FirematClientes />)} />
                <Route path="/firemat/reportes" element={firematRoute(access.firematReportes, <FirematReportes />)} />
                <Route path="/firemat/movimientos" element={firematRoute(access.firematMovimientos || access.firematKardex, <FirematMovimientos />)} />
                <Route
                  path="/firemat/usuarios-parametros"
                  element={firematRoute(access.firemat && access.configuracion, <FirematUsuariosParametros />)}
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
