import React from "react";
import {
  DashboardOutlined,
  ProfileOutlined,
  SettingOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  FireOutlined,
  FileTextOutlined,
  ProjectOutlined,
} from "@ant-design/icons";
import { NavLink } from "react-router-dom";
import type { ThemeMode } from "../hooks/useSystemTheme";
import type { RolUsuario } from "../types/usuario";

export type RoleAccess = {
  dashboard: boolean;
  funnel: boolean;
  registro: boolean;
  ingenieria: boolean;
  reportes: boolean;
  juntaEspuma: boolean;
  cotizaciones: boolean;
  configuracion: boolean;
};

type SidebarProps = {
  themeMode: ThemeMode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  hiddenOnMobile?: boolean;
  user?: { nombre: string; rol: RolUsuario } | null;
  access: RoleAccess;
  onLogout?: () => void;
};

export const SIDEBAR_WIDTH_EXPANDED = 256;
export const SIDEBAR_WIDTH_COLLAPSED = 80;

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  hiddenOnMobile,
  user,
  access,
  onLogout,
}) => {
  const sidebarBase =
    "bg-[#f4f5fb] border-r border-slate-200/80 backdrop-blur-sm";

  const linkBase =
    "flex items-center rounded-xl py-2 text-xs transition-all";

  const getLinkClasses = (isActive: boolean) =>
    isActive
      ? "border border-amber-200 bg-white text-slate-900 shadow-sm"
      : "text-slate-600 hover:bg-white/80 hover:text-slate-900";

  const sectionTitleCls =
    "text-[10px] font-semibold uppercase tracking-wide text-slate-500";

  return (
    <aside
      className={`
        ${sidebarBase}
        ${collapsed ? "w-20" : "w-64"}
        fixed inset-y-0 left-0
        ${hiddenOnMobile ? "hidden md:flex" : "flex"}
        z-40 flex-col
      `}
    >
      <div className="border-b border-slate-200/80 px-3 py-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffcc33] text-xs font-black text-slate-900 shadow-sm">
              BECK
            </div>
            <button
              onClick={onToggleCollapse}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white/80 text-xs text-slate-600 hover:bg-white hover:text-slate-900"
            >
              <MenuUnfoldOutlined />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffcc33] text-xs font-black text-slate-900 shadow-sm">
              BECK
            </div>

            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold text-slate-900">
                BECK Soluciones
              </p>
              <p className="truncate text-[10px] text-slate-500">
                CRM BECK
              </p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-orange-100 bg-orange-50 px-2 py-[2px] text-[10px] text-orange-700">
                <FireOutlined className="text-[10px]" />
                Proteccion pasiva
              </span>
            </div>

            <button
              onClick={onToggleCollapse}
              className="ml-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-600 hover:bg-white hover:text-slate-900"
            >
              <MenuFoldOutlined />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
        {!collapsed && <p className={sectionTitleCls}>Modulos</p>}

        <nav className={`flex flex-col gap-1 ${collapsed ? "items-center" : ""}`}>
          {access.dashboard && (
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `${linkBase} ${
                  collapsed ? "justify-center gap-0 px-0" : "justify-start gap-2 px-3"
                } ${getLinkClasses(isActive)}`
              }
            >
              <DashboardOutlined />
              {!collapsed && <span>Dashboard</span>}
            </NavLink>
          )}

          {access.funnel && (
            <NavLink
              to="/dashboard/funnel"
              className={({ isActive }) =>
                `${linkBase} ${
                  collapsed ? "justify-center gap-0 px-0" : "justify-start gap-2 px-3"
                } ${getLinkClasses(isActive)}`
              }
            >
              <ProjectOutlined />
              {!collapsed && <span>Funnel</span>}
            </NavLink>
          )}

          {access.ingenieria && (
            <NavLink
              to="/ingenieria"
              className={({ isActive }) =>
                `${linkBase} ${
                  collapsed ? "justify-center gap-0 px-0" : "justify-start gap-2 px-3"
                } ${getLinkClasses(isActive)}`
              }
            >
              <FireOutlined />
              {!collapsed && <span>Procesamiento Ingenieria</span>}
            </NavLink>
          )}

          {access.registro && (
            <NavLink
              to="/registro"
              className={({ isActive }) =>
                `${linkBase} ${
                  collapsed ? "justify-center gap-0 px-0" : "justify-start gap-2 px-3"
                } ${getLinkClasses(isActive)}`
              }
            >
              <ProfileOutlined />
              {!collapsed && <span>Registro</span>}
            </NavLink>
          )}

          {access.reportes && (
            <NavLink
              to="/reportes"
              className={({ isActive }) =>
                `${linkBase} ${
                  collapsed ? "justify-center gap-0 px-0" : "justify-start gap-2 px-3"
                } ${getLinkClasses(isActive)}`
              }
            >
              <BarChartOutlined />
              {!collapsed && <span>Reportes</span>}
            </NavLink>
          )}

          {access.cotizaciones && (
            <NavLink
              to="/cotizaciones"
              className={({ isActive }) =>
                `${linkBase} ${
                  collapsed ? "justify-center gap-0 px-0" : "justify-start gap-2 px-3"
                } ${getLinkClasses(isActive)}`
              }
            >
              <FileTextOutlined />
              {!collapsed && <span>Cotizaciones</span>}
            </NavLink>
          )}

          {access.juntaEspuma && (
            <NavLink
              to="/junta-espuma"
              className={({ isActive }) =>
                `${linkBase} ${
                  collapsed ? "justify-center gap-0 px-0" : "justify-start gap-2 px-3"
                } ${getLinkClasses(isActive)}`
              }
            >
              <ThunderboltOutlined />
              {!collapsed && <span>Junta lineal espuma</span>}
            </NavLink>
          )}
        </nav>

        {access.configuracion && (
          <div className="border-t border-slate-200/80 pt-4">
            {!collapsed && (
              <p className={`${sectionTitleCls} mb-1.5`}>Configuracion</p>
            )}
            <nav className={collapsed ? "flex flex-col items-center" : ""}>
              <NavLink
                to="/configuracion"
                className={({ isActive }) =>
                  `${linkBase} ${
                    collapsed ? "justify-center gap-0 px-0" : "justify-start gap-2 px-3"
                  } ${getLinkClasses(isActive)}`
                }
              >
                <SettingOutlined />
                {!collapsed && <span>Usuarios y parametros</span>}
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200/80 px-3 py-3 text-[10px]">
        {user && (
          <div
            className={
              collapsed
                ? "mb-2 flex items-center justify-center"
                : "mb-2 flex items-center justify-between gap-2"
            }
          >
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-slate-800">
                  {user.nombre}
                </p>
                <p className="truncate text-[10px] text-slate-500">{user.rol}</p>
              </div>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white/80 text-xs text-slate-600 hover:bg-white hover:text-slate-900"
                title="Cerrar sesion"
              >
                <LogoutOutlined />
              </button>
            )}
          </div>
        )}

        {!collapsed && (
          <>
            <p className="text-slate-400">Version 0.1</p>
            <p className="text-slate-400">© 2025 BECK Soluciones</p>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
