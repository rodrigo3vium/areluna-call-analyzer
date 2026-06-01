"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type SerieSemana = {
  semana: string;
  score_whatsapp: number | null;
  score_calls: number | null;
};

type Props = {
  dados: SerieSemana[];
};

function formatarSemana(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function ScoreChart({ dados }: Props) {
  const data = dados.map((d) => ({
    semana: formatarSemana(d.semana),
    WhatsApp: d.score_whatsapp,
    Calls: d.score_calls,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <Tooltip
          contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
          labelStyle={{ color: "#e2e8f0" }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
        <Line
          type="monotone"
          dataKey="WhatsApp"
          stroke="#06b6d4"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="Calls"
          stroke="#818cf8"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
