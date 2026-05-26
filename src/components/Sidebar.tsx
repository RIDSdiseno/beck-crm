import React, { useEffect, useRef, useState } from "react";
import {
  DashboardOutlined,
  ProfileOutlined,
  SettingOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  FireOutlined,
  FileTextOutlined,
  ProjectOutlined,
  HistoryOutlined,
  BuildOutlined,
  ToolOutlined,
  AppstoreOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  CheckOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { ThemeMode } from "../hooks/useSystemTheme";
import type { RolUsuario } from "../types/usuario";

export type RoleAccess = {
  // Beck modules
  dashboard: boolean;
  funnel: boolean;
  registro: boolean;
  ingenieria: boolean;
  oficinaTecnica: boolean;
  reportes: boolean;
  cotizaciones: boolean;
  movimientos: boolean;
  obras: boolean;
  configuracion: boolean;
  clientes: boolean;
  // Firemat modules
  firemat: boolean;
  firematDashboard: boolean;
  firematFunnel: boolean;
  firematCotizaciones: boolean;
  firematProductos: boolean;
  firematCategorias: boolean;
  firematInventario: boolean;
  firematKardex: boolean;
  firematVentas: boolean;
  firematReportes: boolean;
  firematMovimientos: boolean;
  firematClientes: boolean;
};

type Company = "beck" | "firemat";

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

const ROUTE_MAP: Record<string, Record<string, string>> = {
  beck: {
    "/beck/dashboard": "/firemat/dashboard",
    "/beck/funnel": "/firemat/funnel",
    "/beck/cotizaciones": "/firemat/cotizaciones",
    "/beck/reportes": "/firemat/reportes",
    "/beck/movimientos": "/firemat/movimientos",
    "/beck/usuarios-parametros": "/firemat/usuarios-parametros",
  },
  firemat: {
    "/firemat/dashboard": "/beck/dashboard",
    "/firemat/funnel": "/beck/funnel",
    "/firemat/cotizaciones": "/beck/cotizaciones",
    "/firemat/reportes": "/beck/reportes",
    "/firemat/movimientos": "/beck/movimientos",
    "/firemat/usuarios-parametros": "/beck/usuarios-parametros",
  },
};

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

  const location = useLocation();
  const navigate = useNavigate();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const isFiremat = location.pathname.startsWith("/firemat");
  const activeCompany: Company = isFiremat ? "firemat" : "beck";

  const isBeck = activeCompany === "beck";
  const logoSrc = isFiremat ? "/Firemat_logo.png" : "/logo.png";
  const brandName = isFiremat ? "Firemat" : "BECK Soluciones";
  const brandSubtitle = isFiremat ? "CRM FIREMAT" : "CRM BECK";
  const brandBadge = isFiremat ? "Inventario y ventas" : "Protección pasiva";

  useEffect(() => {
    document.title = isFiremat ? "Firemat | CRM" : "BECK Soluciones | CRM";
  }, [isFiremat]);

  useEffect(() => {
    const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;

    if (favicon) {
      favicon.href = isFiremat ? "/Firemat_logo.png" : "/logo.png";
    }
  }, [isFiremat]);

  const puedeCambiarEmpresa = user?.rol === "Administrador";

  const handleCompanySwitch = (company: Company) => {
    if (user?.rol !== "Administrador") return;
    setSelectorOpen(false);
    if (company === activeCompany) return;
    if (company === "firemat" && !access.firemat) return;

    const map = ROUTE_MAP[activeCompany];
    const equivalent = map[location.pathname];
    navigate(equivalent ?? (company === "beck" ? "/beck/dashboard" : "/firemat/dashboard"), {
      replace: true,
    });
  };

  /* ── Styling tokens by company ──────────────────────────── */
  const sidebarBg = isBeck
    ? "bg-[#f6f5ee]/95 border-beck-border-light"
    : "bg-[#f5f3f3]/95 border-firemat-border";

  const linkBase = "flex items-center rounded-xl py-2 text-xs transition-all";

  const getLinkClasses = (isActive: boolean) => {
    if (isActive) {
      return isBeck
        ? "border border-[#decb7e] bg-[#fff7d6] text-beck-ink shadow-sm sidebar-link-active"
        : "border border-[#f4c4ba] bg-[#fde8e4] text-firemat-primary-dark shadow-sm sidebar-link-active";
    }
    return "text-beck-ink-soft hover:bg-white/80 hover:text-beck-ink";
  };

  const sectionTitleCls =
    "text-[10px] font-semibold uppercase tracking-wide text-beck-muted";

  const badgeClasses = isBeck
    ? "mt-1 inline-flex items-center gap-1 rounded-full border border-[#decb7e] bg-[#fff7d6] px-2 py-[2px] text-[10px] text-beck-ink"
    : "mt-1 inline-flex items-center gap-1 rounded-full border border-[#f4c4ba] bg-[#fde8e4] px-2 py-[2px] text-[10px] text-firemat-primary-dark";

  /* ── Nav items by company ───────────────────────────────── */
  const beckNav = [
    { key: "dashboard", to: "/beck/dashboard", icon: <DashboardOutlined />, label: "Dashboard", access: access.dashboard },
    { key: "ingenieria", to: "/beck/procesamiento-ingenieria", icon: <FireOutlined />, label: "Procesamiento Ingeniería", access: access.ingenieria },
    { key: "oficinaTecnica", to: "/beck/oficina-tecnica", icon: <ToolOutlined />, label: "Oficina Técnica", access: access.oficinaTecnica },
    { key: "registro", to: "/beck/registro", icon: <ProfileOutlined />, label: "Registro", access: access.registro },
    { key: "reportes", to: "/beck/reportes", icon: <BarChartOutlined />, label: "Reportes", access: access.reportes },
    { key: "cotizaciones", to: "/beck/cotizaciones", icon: <FileTextOutlined />, label: "Cotizaciones", access: access.cotizaciones },
    { key: "movimientos", to: "/beck/movimientos", icon: <HistoryOutlined />, label: "Movimientos", access: access.movimientos },
    { key: "obras", to: "/beck/obras", icon: <BuildOutlined />, label: "Obras", access: access.obras },
    { key: "funnel", to: "/beck/funnel", icon: <ProjectOutlined />, label: "Funnel", access: access.funnel },
    { key: "clientes", to: "/beck/clientes", icon: <TeamOutlined />, label: "Clientes", access: access.clientes },
  ];

  const firematNav = [
    { key: "dashboard", to: "/firemat/dashboard", icon: <DashboardOutlined />, label: "Dashboard", access: access.firematDashboard },
    { key: "funnel", to: "/firemat/funnel", icon: <ProjectOutlined />, label: "Funnel", access: access.firematFunnel },
    { key: "cotizaciones", to: "/firemat/cotizaciones", icon: <FileTextOutlined />, label: "Cotizaciones", access: access.firematCotizaciones },
    { key: "clientes", to: "/firemat/clientes", icon: <TeamOutlined />, label: "Clientes", access: access.firematClientes },
    { key: "productos", to: "/firemat/productos", icon: <AppstoreOutlined />, label: "Productos", access: access.firematProductos },
    { key: "inventario", to: "/firemat/inventario", icon: <InboxOutlined />, label: "Inventario", access: access.firematInventario },
    { key: "ventas", to: "/firemat/ventas", icon: <ShoppingCartOutlined />, label: "Ventas", access: access.firematVentas },
    { key: "movimientos", to: "/firemat/movimientos", icon: <HistoryOutlined />, label: "Movimientos", access: access.firematMovimientos || access.firematKardex },
    { key: "reportes", to: "/firemat/reportes", icon: <BarChartOutlined />, label: "Reportes", access: access.firematReportes },
  ];

  const navItems = isBeck ? beckNav : firematNav;
  const companyOptions: Company[] = access.firemat ? ["beck", "firemat"] : ["beck"];

  return (
    <aside
      className={`
        ${sidebarBg}
        border-r backdrop-blur-sm
        ${collapsed ? "w-20" : "w-64"}
        fixed inset-y-0 left-0
        ${hiddenOnMobile ? "hidden md:flex" : "flex"}
        z-40 flex-col theme-${activeCompany} sidebar-root
      `}
    >
      {/* ── Company header / selector ────────────────────────── */}
      <div className="border-b border-inherit px-3 py-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src={logoSrc}
              alt={brandName}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/logo.png";
              }}
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
          <div className="flex items-start gap-2">
            <div className="relative min-w-0 flex-1" ref={selectorRef}>
              <button
                type="button"
                onClick={() => puedeCambiarEmpresa && setSelectorOpen((v) => !v)}
                className="flex w-full items-center gap-2 rounded-xl p-1 transition hover:bg-white/60"
              >
                <img
                  src={logoSrc}
                  alt={brandName}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/logo.png";
                  }}
                  className="h-8 w-auto object-contain flex-shrink-0"
                />
                <div className="min-w-0 flex-1 text-left leading-tight">
                  <p className="truncate text-xs font-semibold text-beck-ink">
                    {brandName}
                  </p>
                  <p className="truncate text-[10px] text-beck-muted">
                    {brandSubtitle}
                  </p>
                  <span className={badgeClasses}>
                    <FireOutlined className="text-[10px]" />
                    {brandBadge}
                  </span>
                </div>
                {puedeCambiarEmpresa && <SwapOutlined className="flex-shrink-0 text-beck-muted text-xs" />}
              </button>

              {puedeCambiarEmpresa && selectorOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-beck-border-light bg-white shadow-beck-panel">
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-beck-muted">
                    Cambiar empresa
                  </p>
                  {companyOptions.map((company) => (
                    <button
                      key={company}
                      type="button"
                      onClick={() => handleCompanySwitch(company)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-beck-surface-light"
                    >
                      {activeCompany === company ? (
                        <CheckOutlined className="text-[10px] text-beck-primary" />
                      ) : (
                        <span className="w-3" />
                      )}
                      <span className="font-medium text-beck-ink">
                        {company === "beck" ? "BECK Soluciones" : "Firemat"}
                      </span>
                      <span className="ml-auto text-[10px] text-beck-muted">
                        {company === "beck" ? "CRM BECK" : "CRM FIREMAT"}
                      </span>
                    </button>
                  ))}
                  <div className="h-1" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleCollapse}
              className="beck-icon-button mt-1 h-7 w-7 flex-shrink-0 text-xs"
            >
              <MenuFoldOutlined />
            </button>
          </div>
        )}
      </div>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <div className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
        {!collapsed && <p className={sectionTitleCls}>Módulos</p>}

        <nav className={`flex flex-col gap-1 ${collapsed ? "items-center" : ""}`}>
          {navItems.filter((item) => item.access).map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.to.endsWith("dashboard")}
              className={({ isActive }) =>
                `${linkBase} ${
                  collapsed
                    ? "justify-center gap-0 px-0"
                    : "justify-start gap-2 px-3"
                } ${getLinkClasses(isActive)}`
              }
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {(access.configuracion || (isBeck && access.ingenieria)) && (
          <div className="border-t border-inherit pt-4">
            {!collapsed && (
              <p className={`${sectionTitleCls} mb-1.5`}>Configuración</p>
            )}
            <nav className={collapsed ? "flex flex-col items-center" : ""}>
              {access.configuracion && (
              <NavLink
                to={isBeck ? "/beck/usuarios-parametros" : "/firemat/usuarios-parametros"}
                className={({ isActive }) =>
                  `${linkBase} ${
                    collapsed
                      ? "justify-center gap-0 px-0"
                      : "justify-start gap-2 px-3"
                  } ${getLinkClasses(isActive)}`
                }
              >
                <SettingOutlined />
                {!collapsed && <span>Usuarios y parámetros</span>}
              </NavLink>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* ── User footer ────────────────────────────────────────── */}
      <div className="border-t border-inherit px-3 py-3 text-[10px]">
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
                title="Cerrar sesión"
              >
                <LogoutOutlined />
              </button>
            )}
          </div>
        )}

        {!collapsed && (
          <>
            <p className="text-beck-muted/80">Versión 0.1</p>
            <p className="text-beck-muted/80">
              Copyright 2025 BECK / Firemat
            </p>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
