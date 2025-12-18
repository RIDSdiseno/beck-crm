// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { RegistrosProvider } from "./context/RegistrosProvider";
import { AuthProvider } from "./context/AuthProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RegistrosProvider>
          <App />
        </RegistrosProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
