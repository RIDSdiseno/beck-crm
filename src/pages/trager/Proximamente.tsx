import React from "react";
import { Button } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const TragerProximamente: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="firemat-panel px-5 py-8">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fde8e4] text-firemat-primary">
          <ClockCircleOutlined />
        </div>
        <div className="mt-4 firemat-badge justify-center">
          <span>Trager</span>
          <span className="text-[10px] uppercase tracking-wide">CRM TRAGER</span>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-beck-ink">
          Modulo proximamente
        </h1>
        <p className="mt-2 text-sm text-beck-muted">
          Este modulo Trager todavia no esta activo en frontend y no consume
          datos externos.
        </p>
        <Button
          type="primary"
          className="mt-5"
          onClick={() => navigate("/trager/dashboard", { replace: true })}
        >
          Ir al dashboard
        </Button>
      </div>
    </section>
  );
};

export default TragerProximamente;
