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
  SafetyCertificateOutlined,
  FileSearchOutlined,
} from "@ant-design/icons";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import type { ThemeMode } from "../hooks/useSystemTheme";
import type { RolUsuario } from "../types/usuario";
import { usePermisos } from "../hooks/usePermisos";
import { EMPRESA_STORAGE_KEY, type ModuloBeck } from "../services/api";
import {
  getEmpresaFromPath,
  getEquivalentCompanyPath,
  PLATAFORMAS,
  type EmpresaActiva,
} from "../platforms";

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
  // Cliente externo
  clienteRegistros: boolean;
};

type Company = EmpresaActiva;

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

const BECK_NAV_MODULO: Partial<Record<string, ModuloBeck>> = {
  dashboard: "beck_dashboard",
  ingenieria: "beck_procesamiento_ingenieria",
  oficinaTecnica: "beck_oficina_tecnica",
  registro: "beck_registro",
  reportes: "beck_reportes",
  cotizaciones: "beck_cotizaciones",
  movimientos: "beck_movimientos",
  obras: "beck_obras",
  funnel: "beck_funnel",
  clientes: "beck_clientes",
  clienteRegistros: "beck_vista_cliente",
};

const FIREMAT_NAV_MODULO: Partial<Record<string, ModuloBeck>> = {
  dashboard: "firemat_dashboard",
  funnel: "firemat_funnel",
  cotizaciones: "firemat_cotizaciones",
  clientes: "firemat_clientes",
  productos: "firemat_productos",
  categorias: "firemat_categorias",
  inventario: "firemat_inventario",
  ventas: "firemat_ventas",
  movimientos: "firemat_movimientos",
  reportes: "firemat_reportes",
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
  const { permisos, refreshingPermisos, loadingPermisos, permisosReady } = usePermisos();

  const location = useLocation();
  const navigate = useNavigate();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const activeCompany: Company = getEmpresaFromPath(location.pathname);
  const activeConfig = PLATAFORMAS[activeCompany];
  const isFirematLike = activeConfig.theme === "firemat";
  const isCliente = user?.rol?.toLowerCase() === "cliente";
  const permisosLoading = refreshingPermisos || loadingPermisos || !permisosReady;

  const isBeck = activeCompany === "beck";
  const logoSrc = activeConfig.logo;
  const brandName = activeConfig.nombre;
  const brandSubtitle = activeConfig.crm;
  const brandBadge = activeConfig.badge;

  useEffect(() => {
    document.title = `${brandName} | CRM`;
  }, [brandName]);

  useEffect(() => {
    const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;

    if (favicon) {
      favicon.href = logoSrc;
    }
  }, [logoSrc]);

  const isAdmin = user?.rol === "Administrador";
  const hasViewPermission = (modulo: ModuloBeck): boolean =>
    permisosReady && Array.isArray(permisos) && permisos.some((p) => p.modulo === modulo && p.puedeVer);
  const hasEditPermission = (modulo: ModuloBeck): boolean =>
    permisosReady && Array.isArray(permisos) && permisos.some((p) => p.modulo === modulo && p.puedeEditar);
  const canCambiarEmpresaBeck =
    !isCliente && (isAdmin || hasViewPermission("beck_cambiar_empresa") || hasEditPermission("beck_cambiar_empresa"));
  const canCambiarEmpresaFiremat =
    !isCliente && (isAdmin || hasViewPermission("firemat_cambiar_empresa") || hasEditPermission("firemat_cambiar_empresa"));
  const canCambiarEmpresaTrager = canCambiarEmpresaFiremat;
  const puedeCambiarEmpresa = canCambiarEmpresaBeck || canCambiarEmpresaFiremat || canCambiarEmpresaTrager;

  const handleCompanySwitch = (company: Company) => {
    if (company === "beck" && !canCambiarEmpresaBeck) return;
    if (company === "firemat" && !canCambiarEmpresaFiremat) return;
    if (company === "trager" && !canCambiarEmpresaTrager) return;
    setSelectorOpen(false);
    if (company === activeCompany) return;

    window.localStorage.setItem(EMPRESA_STORAGE_KEY, company);
    navigate(getEquivalentCompanyPath(location.pathname, company), { replace: true });
  };

  const renderLogo = (className: string) =>
    activeCompany === "trager" ? (
      <span
        aria-label="Trager"
        className={`${className} inline-flex items-center justify-center rounded-md bg-[#e63c1e] px-2 text-sm font-bold text-white`}
      >
        T
      </span>
    ) : (
      <img
        src={logoSrc}
        alt={brandName}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/logo.png";
        }}
        className={className}
      />
    );

  /* ── Styling tokens by company ──────────────────────────── */
  const sidebarBg = isBeck
    ? "bg-[#f6f5ee]/95 border-beck-border-light"
    : "bg-[#f5f3f3]/95 border-firemat-border";
  const themeClass = activeConfig.theme === "firemat" ? "theme-firemat" : "theme-beck";

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
    { key: "clienteRegistros", to: "/cliente/registros-mi-empresa", icon: <FileSearchOutlined />, label: "Vista Cliente", access: access.clienteRegistros },
  ];

  const firematBase = isFirematLike ? activeCompany : "firemat";
  const firematNav = [
    { key: "dashboard", to: `/${firematBase}/dashboard`, icon: <DashboardOutlined />, label: "Dashboard", access: access.firematDashboard },
    { key: "funnel", to: `/${firematBase}/funnel`, icon: <ProjectOutlined />, label: "Funnel", access: access.firematFunnel },
    { key: "cotizaciones", to: `/${firematBase}/cotizaciones`, icon: <FileTextOutlined />, label: "Cotizaciones", access: access.firematCotizaciones },
    { key: "clientes", to: `/${firematBase}/clientes`, icon: <TeamOutlined />, label: "Clientes", access: access.firematClientes },
    { key: "productos", to: `/${firematBase}/productos`, icon: <AppstoreOutlined />, label: "Productos", access: access.firematProductos },
    {key: "categorias", to: `/${firematBase}/categorias`, icon: <ProfileOutlined/>, label: "Categorias", access: access.firematCategorias } ,
    { key: "inventario", to: `/${firematBase}/inventario`, icon: <InboxOutlined />, label: "Inventario", access: access.firematInventario },
    { key: "ventas", to: `/${firematBase}/ventas`, icon: <ShoppingCartOutlined />, label: "Ventas", access: access.firematVentas },
    { key: "movimientos", to: `/${firematBase}/movimientos`, icon: <HistoryOutlined />, label: "Movimientos", access: access.firematMovimientos || access.firematKardex },
    { key: "reportes", to: `/${firematBase}/reportes`, icon: <BarChartOutlined />, label: "Reportes", access: access.firematReportes },
  ];

  const tragerNav = [
    { key: "dashboard", to: "/trager/dashboard", icon: <DashboardOutlined />, label: "Dashboard", access: access.firematDashboard },
    { key: "funnel", to: "/trager/funnel", icon: <ProjectOutlined />, label: "Funnel", access: access.firematFunnel },
    { key: "clientes", to: "/trager/clientes", icon: <TeamOutlined />, label: "Clientes", access: access.firematClientes },
  ];

  const clienteNav = [
    {
      key: "registros-mi-empresa",
      to: "/cliente/registros-mi-empresa",
      icon: <FileSearchOutlined />,
      label: "Registros de mi empresa",
      access: access.clienteRegistros,
    },
    {
      key: "itemizado-obra",
      to: "/cliente/itemizado-obra",
      icon: <BuildOutlined />,
      label: "Itemizado de la obra",
      access: access.clienteRegistros,
    },
  ];

  const navItems = isCliente
    ? clienteNav
    : isBeck
      ? beckNav
      : activeCompany === "trager"
        ? tragerNav
        : firematNav;
  const visibleNavItems = isCliente
    ? clienteNav
    : permisosLoading
      ? []
      : navItems.filter((item) => {
          if (isBeck) {
            const modulo = BECK_NAV_MODULO[item.key];
            if (modulo) return hasViewPermission(modulo);
          } else {
            const modulo = FIREMAT_NAV_MODULO[item.key];
            if (modulo) return hasViewPermission(modulo);
          }
          return item.access === true;
        });
  const showConfigSection =
    !isCliente &&
    permisosReady &&
    (isBeck
      ? hasViewPermission("beck_usuarios_parametros") ||
        hasViewPermission("beck_reglas_validacion")
      : activeCompany !== "trager" && hasViewPermission("firemat_usuarios_parametros"));
  const companyOptions: Company[] = [
    ...(canCambiarEmpresaBeck ? (["beck"] as Company[]) : []),
    ...(canCambiarEmpresaFiremat ? (["firemat"] as Company[]) : []),
    ...(canCambiarEmpresaTrager ? (["trager"] as Company[]) : []),
  ];

  return (
    <aside
      className={`
        ${sidebarBg}
        border-r backdrop-blur-sm
        ${collapsed ? "w-20" : "w-64"}
        fixed inset-y-0 left-0
        ${hiddenOnMobile ? "hidden md:flex" : "flex"}
        z-40 flex-col ${themeClass} sidebar-root
      `}
    >
      {/* ── Company header / selector ────────────────────────── */}
      <div className="border-b border-inherit px-3 py-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            {renderLogo("h-8 min-w-8 w-auto object-contain")}
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
                {renderLogo("h-8 min-w-8 w-auto object-contain flex-shrink-0")}
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
                        {PLATAFORMAS[company].nombre}
                      </span>
                      <span className="ml-auto text-[10px] text-beck-muted">
                        {PLATAFORMAS[company].crm}
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

        {!isCliente && permisosLoading ? (
          <div className={`flex flex-col gap-2 ${collapsed ? "items-center" : ""}`}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`animate-pulse rounded-xl bg-black/5 ${
                  collapsed ? "h-9 w-9" : "h-8 w-full"
                }`}
              />
            ))}
          </div>
        ) : (
          <nav className={`flex flex-col gap-1 ${collapsed ? "items-center" : ""}`}>
            {visibleNavItems.map((item) => (
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
        )}

        {/* Configuración */}
        {showConfigSection && (
          <div className="border-t border-inherit pt-4">
            {!collapsed && (
              <p className={`${sectionTitleCls} mb-1.5`}>Configuración</p>
            )}
            <nav className={`flex flex-col gap-1 ${collapsed ? "items-center" : ""}`}>
              {(isBeck ? hasViewPermission("beck_usuarios_parametros") : hasViewPermission("firemat_usuarios_parametros")) && (
              <NavLink
                to={isBeck ? "/beck/usuarios-parametros" : `/${firematBase}/usuarios-parametros`}
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
              {isBeck && user?.rol === "Administrador" && (
              <NavLink
                to="/beck/permisos"
                className={({ isActive }) =>
                  `${linkBase} ${
                    collapsed
                      ? "justify-center gap-0 px-0"
                      : "justify-start gap-2 px-3"
                  } ${getLinkClasses(isActive)}`
                }
              >
                <SafetyCertificateOutlined />
                {!collapsed && <span>Permisos</span>}
              </NavLink>
              )}
              {!isBeck && hasViewPermission("firemat_usuarios_parametros") && (
              <NavLink
                to={`/${firematBase}/permisos`}
                className={({ isActive }) =>
                  `${linkBase} ${
                    collapsed
                      ? "justify-center gap-0 px-0"
                      : "justify-start gap-2 px-3"
                  } ${getLinkClasses(isActive)}`
                }
              >
                <SafetyCertificateOutlined />
                {!collapsed && <span>Permisos</span>}
              </NavLink>
              )}
              {isBeck && hasViewPermission("beck_reglas_validacion") && (
              <NavLink
                to="/beck/configuracion-validacion"
                className={({ isActive }) =>
                  `${linkBase} ${
                    collapsed
                      ? "justify-center gap-0 px-0"
                      : "justify-start gap-2 px-3"
                  } ${getLinkClasses(isActive)}`
                }
              >
                <SafetyCertificateOutlined />
                {!collapsed && <span>Reglas de Validación</span>}
              </NavLink>
              )}
              {!isBeck && user?.rol === "Administrador" && (
              <NavLink
                to={activeCompany === "trager" ? "/trager/reglas-validacion" : "/firemat/configuracion-validacion"}
                className={({ isActive }) =>
                  `${linkBase} ${
                    collapsed
                      ? "justify-center gap-0 px-0"
                      : "justify-start gap-2 px-3"
                  } ${getLinkClasses(isActive)}`
                }
              >
                <SafetyCertificateOutlined />
                {!collapsed && <span>Reglas de Validación</span>}
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
              Copyright 2025 BECK / Firemat / Trager
            </p>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
