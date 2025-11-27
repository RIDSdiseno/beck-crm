// src/pages/Login.tsx
import React from "react";
import { Form, Input, Button, Checkbox } from "antd";
import {
  SafetyCertificateOutlined,
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import type { ThemeMode } from "../hooks/useSystemTheme";

type LoginProps = {
  themeMode: ThemeMode;
  onLogin: (values: { email: string; password: string }) => void;
};

// 👇 Tipo explícito para los valores del formulario
type LoginFormValues = {
  email: string;
  password: string;
  remember?: boolean;
};

const Login: React.FC<LoginProps> = ({ themeMode, onLogin }) => {
  const isDark = themeMode === "dark";

  const handleFinish = (values: LoginFormValues) => {
    onLogin({ email: values.email, password: values.password });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Fondo con foto */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/login.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Overlay según tema para que el contenido sea legible */}
      <div
        className={`absolute inset-0 ${
          isDark ? "bg-black/75" : "bg-black/55"
        }`}
      />

      {/* Contenido del login */}
      <div className="relative min-h-screen flex items-center justify-center px-4">
        {/* Glows extra encima del overlay */}
        <div className="pointer-events-none absolute -top-40 -left-10 h-72 w-72 rounded-full bg-beck-primary/35 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-80px] right-[-40px] h-80 w-80 rounded-full bg-beck-primary-dark/40 blur-3xl" />

        <motion.div
          className="max-w-4xl w-full grid md:grid-cols-[1.1fr,1fr] gap-8 items-stretch relative z-10"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Panel izquierdo: branding (siempre sobre fondo oscuro) */}
          <motion.div
            className="hidden md:flex flex-col justify-between rounded-3xl p-8 border border-white/10 bg-black/40 backdrop-blur-md shadow-beck-soft"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-beck-primary to-beck-accent flex items-center justify-center">
                  <SafetyCertificateOutlined
                    style={{ fontSize: 20, color: "#111" }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-50">
                    BECK Soluciones
                  </p>
                  <p className="text-[11px] text-slate-300">
                    CRM de sellos cortafuego
                  </p>
                </div>
              </div>

              <h2 className="mt-8 text-2xl font-semibold leading-snug text-slate-50">
                Controla tu obra con precisión,
                <br />
                sin salir de un solo panel.
              </h2>
              <p className="mt-3 text-xs text-slate-300">
                El CRM BECK centraliza el registro de sellos cortafuego, fotos,
                factores y KPIs de avance. Desde aquí se alimentan los reportes
                hacia mandantes, contratistas y supervisión interna.
              </p>
            </div>

            <div className="mt-6 space-y-2 text-[11px] text-slate-300">
              <p>• Registro rápido de itemizado BECK / SACYR desde obra.</p>
              <p>• KPIs en tiempo real por piso, equipo y tipo de sello.</p>
              <p>• Integración futura con Cloudinary y microservicios BECK.</p>
            </div>
          </motion.div>

          {/* Panel derecho: formulario de login */}
          <motion.div
            className={`rounded-3xl p-8 border shadow-beck-soft flex flex-col justify-center ${
              isDark
                ? "bg-beck-card-dark/95 border-beck-border-dark"
                : "bg-white/95 border-beck-border-light"
            } backdrop-blur-md`}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            <div className="mb-6">
              <p
                className={`text-xs font-semibold tracking-wide uppercase ${
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
                Usa tus credenciales corporativas BECK. Más adelante conectaremos
                SSO / Directorio.
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

              <div className="flex items-center justify-between mb-4">
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
                  className="text-[11px] text-beck-accent hover:text-beck-primary underline-offset-2 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  className="bg-beck-primary hover:bg-beck-primary-dark border-none"
                >
                  Entrar al CRM
                </Button>
              </Form.Item>

              <p
                className={`mt-2 text-[10px] ${
                  isDark ? "text-slate-500" : "text-slate-600"
                }`}
              >
                Esta es una versión demo. La validación real se hará contra el
                microservicio de autenticación (API BECK) en el backend.
              </p>
            </Form>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
