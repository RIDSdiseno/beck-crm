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
  themeMode,
  collapsed,
  onToggleCollapse,
  hiddenOnMobile,
  user,
  access,
  onLogout,
}) => {
  void themeMode;

  const sidebarBase =
    "bg-[#f6f5ee]/95 border-r border-beck-border-light backdrop-blur-sm";

  const linkBase = "flex items-center rounded-xl py-2 text-xs transition-all";

  const getLinkClasses = (isActive: boolean) =>
    isActive
      ? "border border-[#decb7e] bg-[#fff7d6] text-beck-ink shadow-sm"
      : "text-beck-ink-soft hover:bg-white/80 hover:text-beck-ink";

  const sectionTitleCls =
    "text-[10px] font-semibold uppercase tracking-wide text-beck-muted";

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
      <div className="border-b border-beck-border-light px-3 py-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src="/logo.png"
              alt="BECK Soluciones"
              className="h-8 w-auto object-contain"
            />
            <button
              type="button"
              onClick={onToggleCollapse}
              className="beck-icon-button h-8 w-8 text-xs"
            >
              <MenuUnfoldOutlined />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="BECK Soluciones"
              className="h-8 w-auto object-contain"
            />

            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-xs font-semibold text-beck-ink">
                BECK Soluciones
              </p>
              <p className="truncate text-[10px] text-beck-muted">CRM BECK</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#decb7e] bg-[#fff7d6] px-2 py-[2px] text-[10px] text-beck-ink">
                <FireOutlined className="text-[10px]" />
                Proteccion pasiva
              </span>
            </div>

            <button
              type="button"
              onClick={onToggleCollapse}
              className="beck-icon-button ml-auto h-8 w-8 flex-shrink-0 text-xs"
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
        </nav>

        {access.configuracion && (
          <div className="border-t border-beck-border-light pt-4">
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

      <div className="border-t border-beck-border-light px-3 py-3 text-[10px]">
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
                <p className="truncate text-[11px] font-semibold text-beck-ink">
                  {user.nombre}
                </p>
                <p className="truncate text-[10px] text-beck-muted">{user.rol}</p>
              </div>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="beck-icon-button h-9 w-9 flex-shrink-0 text-xs"
                title="Cerrar sesion"
              >
                <LogoutOutlined />
              </button>
            )}
          </div>
        )}

        {!collapsed && (
          <>
            <p className="text-beck-muted/80">Version 0.1</p>
            <p className="text-beck-muted/80">Copyright 2025 BECK Soluciones</p>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
