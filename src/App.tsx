import React, { useEffect, useState } from "react";
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
} from "./components/Sidebar";
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

const getHomeRouteForRole = (rol: RolUsuario): string => {
  if (rol === "Administrador") return "/dashboard";
  if (rol === "Terreno") return "/registro";
  if (rol === "Ingenieria") return "/ingenieria";
  return "/reportes";
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
      navigate(getHomeRouteForRole(user.rol), { replace: true });
    }
  }, [location.pathname, navigate, user]);

  const isLoginRoute = location.pathname === "/login";
  const currentSidebarWidth = collapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : SIDEBAR_WIDTH_EXPANDED;

  const handleLogin = async (values: { email: string; password: string }) => {
    try {
      const authUser = await login(values);
      navigate(getHomeRouteForRole(authUser.rol), { replace: true });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "No se pudo iniciar sesión";
      message.error(errorMessage);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (!user) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<Login themeMode={themeMode} onLogin={handleLogin} />}
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const isAdministrador = user.rol === "Administrador";
  const canUsarTerreno = user.rol === "Administrador" || user.rol === "Terreno";
  const isIngenieria = user.rol === "Ingenieria";
  const homeRoute = getHomeRouteForRole(user.rol);

  if (isLoginRoute) {
    return <Navigate to={homeRoute} replace />;
  }

  return (
    <Layout
      className="bg-slate-100 text-slate-900"
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
          className="bg-slate-100"
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
                  isAdministrador ? (
                    <Dashboard themeMode={themeMode} />
                  ) : (
                    <Navigate to={homeRoute} replace />
                  )
                }
              />
              <Route
                path="/dashboard/funnel"
                element={<FunnelPage themeMode={themeMode} />}
              />
              <Route
                path="/registro"
                element={
                  canUsarTerreno ? (
                    <RegistroSellos themeMode={themeMode} />
                  ) : (
                    <Navigate to={homeRoute} replace />
                  )
                }
              />
              <Route
                path="/ingenieria"
                element={
                  isIngenieria ? (
                    <Ingenieria themeMode={themeMode} />
                  ) : (
                    <Navigate to={homeRoute} replace />
                  )
                }
              />
              <Route
                path="/reportes"
                element={<Reportes themeMode={themeMode} />}
              />
              <Route
                path="/junta-espuma"
                element={
                  canUsarTerreno ? (
                    <JuntaLinealEspuma themeMode={themeMode} />
                  ) : (
                    <Navigate to={homeRoute} replace />
                  )
                }
              />
              <Route
                path="/cotizaciones"
                element={<Cotizaciones themeMode={themeMode} />}
              />
              <Route
                path="/configuracion"
                element={
                  isAdministrador ? (
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
  );
};

const App: React.FC = () => <AppShell />;

export default App;
