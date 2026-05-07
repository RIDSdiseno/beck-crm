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
  BeckJuntaLinealEspuma,
  BeckUsuariosParametros,
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
} from "./pages/firemat";

import type { ThemeMode } from "./hooks/useSystemTheme";
import { useAuth } from "./context/useAuth";
import type { RolUsuario } from "./types/usuario";

const { Content } = Layout;

const ACCESS_DENIED_PATH = "/access-denied";

const isCrmBlockedRole = (rol: RolUsuario): boolean =>
  rol === "Terreno" || rol === "JefeObra";

const getRoleAccess = (rol: RolUsuario): RoleAccess => {
  switch (rol) {
    case "Administrador":
      return {
        dashboard: true,
        funnel: true,
        registro: true,
        ingenieria: true,
        reportes: true,
        juntaEspuma: true,
        cotizaciones: true,
        movimientos: true,
        obras: true,
        configuracion: true,
        firemat: true,
      };
    case "Vendedor":
      return {
        dashboard: false,
        funnel: true,
        registro: false,
        ingenieria: false,
        reportes: true,
        juntaEspuma: false,
        cotizaciones: true,
        movimientos: false,
        obras: false,
        configuracion: false,
        firemat: true,
      };
    case "Terreno":
    case "JefeObra":
      return {
        dashboard: false,
        funnel: false,
        registro: false,
        ingenieria: false,
        reportes: false,
        juntaEspuma: false,
        cotizaciones: false,
        movimientos: false,
        obras: false,
        configuracion: false,
        firemat: false,
      };
    case "Ingenieria":
      return {
        dashboard: false,
        funnel: true,
        registro: true,
        ingenieria: true,
        reportes: true,
        juntaEspuma: false,
        cotizaciones: false,
        movimientos: false,
        obras: true,
        configuracion: false,
        firemat: false,
      };
    case "Visualizador":
    default:
      return {
        dashboard: false,
        funnel: true,
        registro: true,
        ingenieria: false,
        reportes: true,
        juntaEspuma: false,
        cotizaciones: true,
        movimientos: false,
        obras: true,
        configuracion: false,
        firemat: true,
      };
  }
};

const getHomeRouteForRole = (rol: RolUsuario): string => {
  if (isCrmBlockedRole(rol)) {
    return ACCESS_DENIED_PATH;
  }

  switch (rol) {
    case "Administrador":
      return "/beck/dashboard";
    case "Vendedor":
      return "/beck/funnel";
    case "Ingenieria":
      return "/beck/procesamiento-ingenieria";
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
  if (pathname === "/beck/reportes") return access.reportes;
  if (pathname === "/beck/junta-lineal-espuma") return access.juntaEspuma;
  if (pathname === "/beck/cotizaciones") return access.cotizaciones;
  if (pathname === "/beck/movimientos") return access.movimientos;
  if (pathname === "/beck/obras") return access.obras;
  if (pathname === "/beck/usuarios-parametros") return access.configuracion;

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

  const renderFirematRoute = (element: React.ReactElement) =>
    access.firemat ? element : <Navigate to={homeRoute} replace />;

  return (
    <>
      <SessionWatcher />
      <Layout
        className={`${themeClass} bg-beck-bg-light text-beck-ink`}
        style={{ minHeight: "100vh" }}
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
          }}
        >
          <Content
            className={isFiremat ? "bg-firemat-bg" : "bg-beck-bg-light"}
            style={{
              padding: 16,
              paddingTop: isMobile && collapsed ? 56 : 16,
            }}
          >
            <div className="mx-auto max-w-6xl">
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
                <Route path="/junta-espuma" element={<Navigate to="/beck/junta-lineal-espuma" replace />} />
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
                      <BeckFunnel themeMode={themeMode} />
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
                  path="/beck/junta-lineal-espuma"
                  element={
                    access.juntaEspuma ? (
                      <BeckJuntaLinealEspuma themeMode={themeMode} />
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

                {/* ── Firemat routes ──────────────────────────── */}
                <Route path="/firemat/dashboard" element={renderFirematRoute(<FirematDashboard />)} />
                <Route path="/firemat/funnel" element={renderFirematRoute(<FirematFunnel />)} />
                <Route path="/firemat/cotizaciones" element={renderFirematRoute(<FirematCotizaciones />)} />
                <Route path="/firemat/productos" element={renderFirematRoute(<FirematProductos />)} />
                <Route path="/firemat/inventario" element={renderFirematRoute(<FirematInventario />)} />
                <Route path="/firemat/ventas" element={renderFirematRoute(<FirematVentas />)} />
                <Route path="/firemat/reportes" element={renderFirematRoute(<FirematReportes />)} />
                <Route path="/firemat/movimientos" element={renderFirematRoute(<FirematMovimientos />)} />
                <Route
                  path="/firemat/usuarios-parametros"
                  element={
                    access.firemat && access.configuracion ? (
                      <FirematUsuariosParametros />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
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
