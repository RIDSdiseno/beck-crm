import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { RegistrosProvider } from "./context/RegistrosProvider";
import { AuthProvider } from "./context/AuthProvider";
import { PermisosProvider } from "./context/PermisosProvider";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RegistrosProvider>
          <PermisosProvider>
            <App />
          </PermisosProvider>
        </RegistrosProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
