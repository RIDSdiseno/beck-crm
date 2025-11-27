// src/components/Sidebar.tsx
import React from "react";
import {
  DashboardOutlined,
  ProfileOutlined,
  SettingOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FireOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { NavLink } from "react-router-dom";
import type { ThemeMode } from "../hooks/useSystemTheme";

type SidebarProps = {
  themeMode: ThemeMode; // lo recibimos pero el tema es fijo claro
  collapsed: boolean;
  onToggleCollapse: () => void;
};

// Deben calzar con w-64 / w-20 usadas abajo
export const SIDEBAR_WIDTH_EXPANDED = 256; // ~ w-64
export const SIDEBAR_WIDTH_COLLAPSED = 80; // ~ w-20

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const sidebarBase =
    "bg-[#f4f5fb] border-r border-slate-200/80 backdrop-blur-sm";

  const linkBase =
    "flex items-center rounded-xl text-xs transition-all py-2";

  const getLinkClasses = (isActive: boolean) =>
    isActive
      ? "bg-white text-slate-900 shadow-sm border border-amber-200"
      : "text-slate-600 hover:bg-white/80 hover:text-slate-900";

  const sectionTitleCls =
    "text-[10px] font-semibold tracking-wide text-slate-500 uppercase";

  return (
    <aside
      className={`
        ${sidebarBase}
        ${collapsed ? "w-20" : "w-64"}
        fixed inset-y-0 left-0
        flex flex-col
        z-40
      `}
    >
      {/* HEADER */}
      <div className="px-3 py-4 border-b border-slate-200/80">
        {collapsed ? (
          // --- HEADER COLAPSADO ---
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#ffcc33] flex items-center justify-center text-xs font-black text-slate-900 shadow-sm">
              BECK
            </div>
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-300 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 text-xs"
            >
              <MenuUnfoldOutlined />
            </button>
          </div>
        ) : (
          // --- HEADER EXPANDIDO ---
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ffcc33] flex items-center justify-center text-xs font-black text-slate-900 shadow-sm">
              BECK
            </div>

            <div className="flex-1 leading-tight min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                BECK Soluciones
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                Obra demo · CRM BECK
              </p>
              <span className="mt-1 inline-flex items-center gap-1 px-2 py-[2px] rounded-full bg-orange-50 border border-orange-100 text-[10px] text-orange-700">
                <FireOutlined className="text-[10px]" />
                Protección pasiva
              </span>
            </div>

            <button
              onClick={onToggleCollapse}
              className="ml-auto flex items-center justify-center w-8 h-8 rounded-full border border-slate-300 text-slate-600 hover:bg-white hover:text-slate-900 text-xs flex-shrink-0"
            >
              <MenuFoldOutlined />
            </button>
          </div>
        )}
      </div>

      {/* MÓDULOS DE OBRA */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        {!collapsed && <p className={sectionTitleCls}>Módulos de obra</p>}

        <nav
          className={`
            flex flex-col gap-1
            ${collapsed ? "items-center" : ""}
          `}
        >
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `
              ${linkBase}
              ${collapsed ? "justify-center px-0 gap-0" : "justify-start px-3 gap-2"}
              ${getLinkClasses(isActive)}
              `
            }
          >
            <DashboardOutlined />
            {!collapsed && <span>Dashboard</span>}
          </NavLink>

          <NavLink
            to="/registro"
            className={({ isActive }) =>
              `
              ${linkBase}
              ${collapsed ? "justify-center px-0 gap-0" : "justify-start px-3 gap-2"}
              ${getLinkClasses(isActive)}
              `
            }
          >
            <ProfileOutlined />
            {!collapsed && <span>Registro · BECK / SACYR</span>}
          </NavLink>

          <NavLink
            to="/reportes"
            className={({ isActive }) =>
              `
              ${linkBase}
              ${collapsed ? "justify-center px-0 gap-0" : "justify-start px-3 gap-2"}
              ${getLinkClasses(isActive)}
              `
            }
          >
            <BarChartOutlined />
            {!collapsed && <span>Reportes</span>}
          </NavLink>

          {/* NUEVO: COTIZACIONES */}
          <NavLink
            to="/cotizaciones"
            className={({ isActive }) =>
              `
              ${linkBase}
              ${collapsed ? "justify-center px-0 gap-0" : "justify-start px-3 gap-2"}
              ${getLinkClasses(isActive)}
              `
            }
          >
            <FileTextOutlined />
            {!collapsed && <span>Cotizaciones</span>}
          </NavLink>

          <NavLink
            to="/junta-espuma"
            className={({ isActive }) =>
              `
              ${linkBase}
              ${collapsed ? "justify-center px-0 gap-0" : "justify-start px-3 gap-2"}
              ${getLinkClasses(isActive)}
              `
            }
          >
            <ThunderboltOutlined />
            {!collapsed && <span>Junta lineal · ESPUMA</span>}
          </NavLink>
        </nav>

        {/* CONFIGURACIÓN */}
        <div className="pt-4 border-t border-slate-200/80">
          {!collapsed && (
            <p className={`${sectionTitleCls} mb-1.5`}>Configuración</p>
          )}
          <nav className={collapsed ? "flex flex-col items-center" : ""}>
            <NavLink
              to="/configuracion"
              className={({ isActive }) =>
                `
                ${linkBase}
                ${collapsed ? "justify-center px-0 gap-0" : "justify-start px-3 gap-2"}
                ${getLinkClasses(isActive)}
                `
              }
            >
              <SettingOutlined />
              {!collapsed && <span>Usuarios y parámetros</span>}
            </NavLink>
          </nav>
        </div>
      </div>

      {/* FOOTER VERSIÓN */}
      <div className="px-3 py-3 border-t border-slate-200/80 text-[10px]">
        {!collapsed && (
          <>
            <p className="text-slate-400">Versión 0.1 · Demo interactiva</p>
            <p className="text-slate-400">© 2025 BECK Soluciones</p>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
