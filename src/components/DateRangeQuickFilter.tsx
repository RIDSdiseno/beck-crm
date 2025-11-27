// src/components/DateRangeQuickFilter.tsx
import React from "react";
import { DatePicker, Segmented, Tooltip } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

const { RangePicker } = DatePicker;

type PresetKey = "todo" | "hoy" | "semana" | "mes";

type DateRangeQuickFilterProps = {
  value: [Dayjs, Dayjs] | null;
  onChange: (value: [Dayjs, Dayjs] | null) => void;
  isDark: boolean;
};

const DateRangeQuickFilter: React.FC<DateRangeQuickFilterProps> = ({
  value,
  onChange,
  isDark,
}) => {
  const hoy = dayjs();

  const applyPreset = (key: PresetKey) => {
    if (key === "todo") {
      onChange(null);
      return;
    }

    let start = hoy.startOf("day");
    let end = hoy.endOf("day");

    if (key === "semana") {
      start = hoy.startOf("week");
      end = hoy.endOf("week");
    } else if (key === "mes") {
      start = hoy.startOf("month");
      end = hoy.endOf("month");
    }

    onChange([start, end]);
  };

  const currentPreset: PresetKey = (() => {
    if (!value) return "todo";
    const [start, end] = value;
    if (start.isSame(hoy, "day") && end.isSame(hoy, "day")) return "hoy";
    if (
      start.isSame(hoy.startOf("week"), "day") &&
      end.isSame(hoy.endOf("week"), "day")
    )
      return "semana";
    if (
      start.isSame(hoy.startOf("month"), "day") &&
      end.isSame(hoy.endOf("month"), "day")
    )
      return "mes";
    return "todo";
  })();

  return (
    <div className="flex flex-1 flex-col gap-1 min-w-[260px]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <CalendarOutlined className="text-beck-accent" />
          Rango de fechas
        </span>
        <Tooltip title="Atajos: Hoy / Semana / Mes / Toda la obra" placement="topRight">
          <Segmented
            size="small"
            value={currentPreset}
            onChange={(val) => applyPreset(val as PresetKey)}
            options={[
              { label: "Toda la obra", value: "todo" },
              { label: "Hoy", value: "hoy" },
              { label: "Semana", value: "semana" },
              { label: "Mes", value: "mes" },
            ]}
          />
        </Tooltip>
      </div>

      <RangePicker
        size="small"
        format="DD-MM-YYYY"
        value={value as any}
        onChange={(values) =>
          onChange(
            values && values[0] && values[1]
              ? [values[0], values[1]]
              : null
          )
        }
        placeholder={["Desde", "Hasta"]}
        allowClear
        style={{ width: "100%" }}
        className={
          isDark
            ? "bg-beck-card-dark/60 border-beck-border-dark"
            : "bg-white/80 border-beck-border-light"
        }
      />
    </div>
  );
};

export default DateRangeQuickFilter;
