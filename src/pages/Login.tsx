import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Checkbox, Form, Input, message } from "antd";
import {
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import type { ThemeMode } from "../hooks/useSystemTheme";

type LoginProps = {
  themeMode: ThemeMode;
  onLogin: (values: { email: string; password: string }) => Promise<void> | void;
};

type LoginFormValues = {
  email: string;
  password: string;
  remember?: boolean;
};

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
  /\/$/,
  ""
);
const MICROSOFT_LOGIN_URL = `${API_URL}/auth/microsoft/login`;
const CRM_ACCESS_DENIED_MESSAGE = "Este usuario no tiene acceso al CRM web.";

const Login: React.FC<LoginProps> = ({ themeMode, onLogin }) => {
  const isDark = themeMode === "dark";
  const location = useLocation();
  const navigate = useNavigate();
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);

    if (searchParams.get("crmAccess") !== "denied") {
      return;
    }

    message.error(CRM_ACCESS_DENIED_MESSAGE);
    searchParams.delete("crmAccess");

    const nextSearch = searchParams.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true }
    );
  }, [location.pathname, location.search, navigate]);

  const handleFinish = (values: LoginFormValues) => {
    onLogin({ email: values.email, password: values.password });
  };

  const handleMicrosoftLogin = () => {
    if (isMicrosoftLoading) return;

    setIsMicrosoftLoading(true);
    window.location.href = MICROSOFT_LOGIN_URL;
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/login.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        className={`absolute inset-0 ${
          isDark ? "bg-black/75" : "bg-black/55"
        }`}
      />

      <div className="relative flex min-h-screen items-center justify-center px-4">
        <div className="pointer-events-none absolute -left-10 -top-40 h-72 w-72 rounded-full bg-beck-primary/35 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-80px] right-[-40px] h-80 w-80 rounded-full bg-beck-primary-dark/40 blur-3xl" />

        <motion.div
          className="relative z-10 grid w-full max-w-4xl items-stretch gap-8 md:grid-cols-[1.1fr,1fr]"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <motion.div
            className="hidden flex-col justify-between rounded-3xl border border-white/10 bg-black/40 p-8 shadow-beck-soft backdrop-blur-md md:flex"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-beck-primary to-beck-accent">
                  <SafetyCertificateOutlined
                    style={{ fontSize: 20, color: "#111" }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-50">
                    CRM BECK / FIREMAT / TRAGGER
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Sistema integrado de gestión comercial
                  </p>
                </div>
              </div>

              <h2 className="mt-8 text-2xl font-semibold leading-snug text-slate-50">
                Gestión comercial, obras e inventario
                <br />
                en un solo panel.
              </h2>
              <p className="mt-3 text-xs text-slate-300">
                Sistema integrado de gestión comercial, obras, cotizaciones e
                inventario para BECK Soluciones y Firemat.
              </p>
            </div>

            <div className="mt-6 space-y-2 text-[11px] text-slate-300">
              <p>• Gestión de cotizaciones, obras y pipeline comercial.</p>
              <p>• Control de stock, inventario y ventas Firemat.</p>
              <p>• KPIs en tiempo real por empresa, equipo y módulo.</p>
            </div>
          </motion.div>

          <motion.div
            className={`flex flex-col justify-center rounded-3xl border p-8 shadow-beck-soft backdrop-blur-md ${
              isDark
                ? "border-beck-border-dark bg-beck-card-dark/95"
                : "border-beck-border-light bg-white/95"
            }`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <div className="mb-6">
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  isDark ? "text-beck-accent" : "text-beck-primary-dark"
                }`}
              >
                Acceso a CRM
              </p>
              <h2
                className={`mt-1 text-xl font-semibold ${
                  isDark ? "text-slate-50" : "text-slate-900"
                }`}
              >
                Inicia sesión en tu cuenta
              </h2>
              <p
                className={`mt-1 text-[11px] ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Usa tus credenciales corporativas. El acceso con Microsoft se
                inicia desde el backend.
              </p>
            </div>

            <Form<LoginFormValues>
              layout="vertical"
              size="middle"
              onFinish={handleFinish}
              requiredMark={false}
            >
              <Form.Item
                label={
                  <span
                    className={`text-xs font-medium ${
                      isDark ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    Correo electrónico
                  </span>
                }
                name="email"
                rules={[
                  { required: true, message: "Ingresa tu correo" },
                  { type: "email", message: "Correo inválido" },
                ]}
              >
                <Input
                  prefix={<UserOutlined className="text-slate-400" />}
                  placeholder="nombre.apellido@beck.cl"
                />
              </Form.Item>

              <Form.Item
                label={
                  <span
                    className={`text-xs font-medium ${
                      isDark ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    Contraseña
                  </span>
                }
                name="password"
                rules={[{ required: true, message: "Ingresa tu contraseña" }]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-slate-400" />}
                  placeholder="••••••••"
                />
              </Form.Item>

              <div className="mb-4 flex items-center justify-between">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox
                    className={`text-[11px] ${
                      isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    Recordar sesión
                  </Checkbox>
                </Form.Item>
                <button
                  type="button"
                  className="text-[11px] text-beck-accent underline-offset-2 hover:text-beck-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Form.Item>
                <Button
                  block
                  htmlType="button"
                  onClick={handleMicrosoftLogin}
                  loading={isMicrosoftLoading}
                  disabled={isMicrosoftLoading}
                  className="mb-2 border border-gray-300 hover:border-gray-400"
                >
                  Iniciar sesión con Microsoft
                </Button>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  className="border-none bg-beck-primary hover:bg-beck-primary-dark"
                >
                  Entrar al CRM
                </Button>
              </Form.Item>

              <p
                className={`mt-2 text-[10px] ${
                  isDark ? "text-slate-500" : "text-slate-600"
                }`}
              >
                La validación se realiza contra el microservicio de
                autenticación del backend.
              </p>
            </Form>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
