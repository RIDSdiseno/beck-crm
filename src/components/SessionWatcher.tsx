import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const PUBLIC_PATHS = new Set(["/login", "/auth/callback"]);

const SessionWatcher: React.FC = () => {
  const location = useLocation();
  const { user, refreshSession } = useAuth();

  useEffect(() => {
    if (!user || PUBLIC_PATHS.has(location.pathname)) {
      return;
    }

    void refreshSession().catch(() => undefined);
  }, [location.pathname, refreshSession, user]);

  return null;
};

export default SessionWatcher;
