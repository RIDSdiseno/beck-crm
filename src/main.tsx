// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { RegistrosProvider } from "./context/RegistrosProvider";
import { AuthProvider } from "./context/AuthProvider";
import { msalInstance, msalInitPromise } from "./auth/msalConfig";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

const renderApp = () => {
  root.render(
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
};

async function bootstrap() {
  try {
    await msalInitPromise;
    await msalInstance.handleRedirectPromise();
  } catch (error) {
    console.error("Error initializing MSAL", error);
  }

  renderApp();
}

void bootstrap();
