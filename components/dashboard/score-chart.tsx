"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type SerieSemana = {
  semana: string;
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
    Calls: d.score_calls,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5DBCB" vertical={false} />
        <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#6B5D52" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#6B5D52" }} />
        <Tooltip
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E5DBCB",
            borderRadius: 12,
            fontSize: 12,
          }}
          labelStyle={{ color: "#2E2620" }}
        />
        <Line
          type="monotone"
          dataKey="Calls"
          stroke="#C9A86B"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
