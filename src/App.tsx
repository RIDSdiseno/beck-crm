import React, { useEffect, useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Layout, message } from "antd";

import Sidebar, {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  type RoleAccess,
} from "./components/Sidebar";
import SessionWatcher from "./components/SessionWatcher";
import FunnelPage from "./pages/FunnelPage";
import Configuracion from "./pages/Configuracion";
import Cotizaciones from "./pages/Cotizaciones";
import Dashboard from "./pages/Dashboard";
import Ingenieria from "./pages/Ingenieria";
import JuntaLinealEspuma from "./pages/JuntaLinealEspuma";
import AuthCallback from "./pages/AuthCallback";
import Login from "./pages/Login";
import RegistroSellos from "./pages/RegistroSellos";
import Reportes from "./pages/Reportes";
import type { ThemeMode } from "./hooks/useSystemTheme";
import { useAuth } from "./context/useAuth";
import type { RolUsuario } from "./types/usuario";

const { Content } = Layout;

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
        configuracion: true,
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
        configuracion: false,
      };
    case "Terreno":
      return {
        dashboard: false,
        funnel: true,
        registro: true,
        ingenieria: false,
        reportes: true,
        juntaEspuma: true,
        cotizaciones: false,
        configuracion: false,
      };
    case "Ingenieria":
      return {
        dashboard: false,
        funnel: true,
        registro: false,
        ingenieria: true,
        reportes: true,
        juntaEspuma: false,
        cotizaciones: false,
        configuracion: false,
      };
    case "Visualizador":
    default:
      return {
        dashboard: false,
        funnel: true,
        registro: false,
        ingenieria: false,
        reportes: true,
        juntaEspuma: false,
        cotizaciones: false,
        configuracion: false,
      };
  }
};

const getHomeRouteForRole = (rol: RolUsuario): string => {
  switch (rol) {
    case "Administrador":
      return "/dashboard";
    case "Vendedor":
      return "/dashboard/funnel";
    case "Terreno":
      return "/registro";
    case "Ingenieria":
      return "/ingenieria";
    case "Visualizador":
    default:
      return "/reportes";
  }
};

const canAccessPath = (pathname: string, access: RoleAccess): boolean => {
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/auth/callback"
  ) {
    return true;
  }

  if (pathname.startsWith("/dashboard/funnel")) return access.funnel;
  if (pathname.startsWith("/dashboard")) return access.dashboard;
  if (pathname.startsWith("/registro")) return access.registro;
  if (pathname.startsWith("/ingenieria")) return access.ingenieria;
  if (pathname.startsWith("/reportes")) return access.reportes;
  if (pathname.startsWith("/junta-espuma")) return access.juntaEspuma;
  if (pathname.startsWith("/cotizaciones")) return access.cotizaciones;
  if (pathname.startsWith("/configuracion")) return access.configuracion;

  return true;
};

const getLoginErrorMessage = (error: unknown): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: {
          error?: string;
          message?: string;
        };
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

  return (
    <>
      <SessionWatcher />
      <Layout
        className="bg-beck-bg-light text-beck-ink"
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
            className="bg-beck-bg-light"
            style={{
              padding: 16,
              paddingTop: isMobile && collapsed ? 56 : 16,
            }}
          >
            <div className="mx-auto max-w-6xl">
              <Routes>
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/" element={<Navigate to={homeRoute} replace />} />

                <Route
                  path="/dashboard"
                  element={
                    access.dashboard ? (
                      <Dashboard themeMode={themeMode} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/dashboard/funnel"
                  element={
                    access.funnel ? (
                      <FunnelPage themeMode={themeMode} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/registro"
                  element={
                    access.registro ? (
                      <RegistroSellos themeMode={themeMode} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/ingenieria"
                  element={
                    access.ingenieria ? (
                      <Ingenieria themeMode={themeMode} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/reportes"
                  element={
                    access.reportes ? (
                      <Reportes themeMode={themeMode} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/junta-espuma"
                  element={
                    access.juntaEspuma ? (
                      <JuntaLinealEspuma themeMode={themeMode} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/cotizaciones"
                  element={
                    access.cotizaciones ? (
                      <Cotizaciones themeMode={themeMode} />
                    ) : (
                      <Navigate to={homeRoute} replace />
                    )
                  }
                />
                <Route
                  path="/configuracion"
                  element={
                    access.configuracion ? (
                      <Configuracion themeMode={themeMode} />
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
