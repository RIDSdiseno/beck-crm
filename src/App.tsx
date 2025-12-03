// src/App.tsx
import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Layout } from "antd";

import Sidebar, {
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_COLLAPSED,
} from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import RegistroSellos from "./pages/RegistroSellos";
import JuntaLinealEspuma from "./pages/JuntaLinealEspuma";
import Reportes from "./pages/Reportes";
import Cotizaciones from "./pages/Cotizaciones"; // 👈 NUEVO
import Login from "./pages/Login";
import type { ThemeMode } from "./hooks/useSystemTheme";

const { Content } = Layout;

const AppShell: React.FC = () => {
  // 🔒 Tema fijo: siempre "light"
  const themeMode: ThemeMode = "light";

  const [collapsed, setCollapsed] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    }
  }, [isMobile]);

  const isLoginRoute = location.pathname === "/login";

  const currentSidebarWidth = collapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : SIDEBAR_WIDTH_EXPANDED;

  const handleLogin = () => {
    navigate("/dashboard", { replace: true });
  };

  // Vista login sin sidebar
  if (isLoginRoute) {
    return <Login themeMode={themeMode} onLogin={handleLogin} />;
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
          className="fixed top-3 left-3 z-50 rounded-full bg-white/90 border border-slate-200 shadow px-3 py-2 text-xs font-semibold text-slate-700"
        >
          Menu
        </button>
      )}
      {/* SIDEBAR CLARO A LA IZQUIERDA */}
      <Sidebar
        themeMode={themeMode}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        hiddenOnMobile={isMobile && collapsed}
      />

      {/* CONTENIDO PRINCIPAL */}
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
          <div className="max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route
                path="/dashboard"
                element={<Dashboard themeMode={themeMode} />}
              />
              <Route
                path="/registro"
                element={<RegistroSellos themeMode={themeMode} />}
              />
              <Route
                path="/reportes"
                element={<Reportes themeMode={themeMode} />}
              />
              <Route
                path="/junta-espuma"
                element={<JuntaLinealEspuma themeMode={themeMode} />}
              />
              <Route
                path="/cotizaciones"
                element={<Cotizaciones themeMode={themeMode} />} // 👈 NUEVA RUTA
              />

              {/* fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

const App: React.FC = () => {
  return <AppShell />;
};

export default App;
