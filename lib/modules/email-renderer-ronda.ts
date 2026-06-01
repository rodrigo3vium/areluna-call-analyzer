import type { SnapshotWhatsapp, SnapshotCalls } from "./gerador-ronda";

function scoreColor(score: number): string {
  if (score >= 80) return "#10b981"; // emerald
  if (score >= 60) return "#3b82f6"; // blue
  if (score >= 40) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

function barHtml(label: string, value: number, max: number, color: string): string {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return `
    <tr>
      <td style="font-size:12px;color:#64748b;padding:3px 8px 3px 0;white-space:nowrap">${label}</td>
      <td style="width:100%">
        <div style="background:#1e293b;border-radius:4px;height:12px;width:100%">
          <div style="background:${color};border-radius:4px;height:12px;width:${pct}%"></div>
        </div>
      </td>
      <td style="font-size:12px;color:#94a3b8;padding-left:8px;white-space:nowrap">${value}</td>
    </tr>
  `;
}

function card(titulo: string, conteudo: string): string {
  return `
    <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:16px">
      <h3 style="margin:0 0 12px;font-size:13px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em">${titulo}</h3>
      ${conteudo}
    </div>
  `;
}

export function renderizarRondaWhatsapp(snapshot: SnapshotWhatsapp, nomeCli: string): string {
  const dataInicio = new Date(snapshot.periodo.inicio).toLocaleDateString("pt-BR");
  const dataFim = new Date(snapshot.periodo.fim).toLocaleDateString("pt-BR");

  if (snapshot.total_conversas === 0) {
    return renderizarBase(
      `Ronda WhatsApp — ${nomeCli}`,
      `${dataInicio} a ${dataFim}`,
      `<p style="color:#64748b;font-size:14px">Nenhuma conversa analisada neste período. Verifique se a integração com a Evolution API está ativa.</p>`,
      nomeCli,
    );
  }

  const scoreMediaFormatado = snapshot.score_medio !== null ? snapshot.score_medio.toFixed(1) : "—";
  const scoreCor = snapshot.score_medio !== null ? scoreColor(snapshot.score_medio) : "#64748b";

  const kpisHtml = `
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      ${kpiCard("Conversas analisadas", String(snapshot.total_conversas), "#0891b2")}
      ${kpiCard("Score médio", scoreMediaFormatado, scoreCor)}
      ${snapshot.score_mais_alto !== null ? kpiCard("Score mais alto", String(snapshot.score_mais_alto), "#10b981") : ""}
      ${snapshot.score_mais_baixo !== null ? kpiCard("Score mais baixo", String(snapshot.score_mais_baixo), "#ef4444") : ""}
    </div>
  `;

  const maxDist = Math.max(...snapshot.distribuicao_score.map((d) => d.total), 1);
  const distHtml = card(
    "Distribuição de scores",
    `
    <table style="width:100%;border-collapse:collapse">
      <tbody>
        ${snapshot.distribuicao_score.map((d) => barHtml(d.faixa, d.total, maxDist, "#0891b2")).join("")}
      </tbody>
    </table>
  `,
  );

  const maxTag = Math.max(...snapshot.top_tags_negativas.map((t) => t.total), 1);
  const tagsNegHtml =
    snapshot.top_tags_negativas.length > 0
      ? card(
          "Principais problemas detectados",
          `
      <table style="width:100%;border-collapse:collapse">
        <tbody>
          ${snapshot.top_tags_negativas
            .slice(0, 8)
            .map((t) => barHtml(t.tag, t.total, maxTag, "#ef4444"))
            .join("")}
        </tbody>
      </table>
    `,
        )
      : "";

  const criticasHtml =
    snapshot.conversas_criticas.length > 0
      ? card(
          "Conversas críticas (score < 40)",
          `
      ${snapshot.conversas_criticas
        .map(
          (c) => `
        <div style="padding:8px 0;border-bottom:1px solid #334155">
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:13px;color:#cbd5e1">${c.lead_nome ?? "Lead sem nome"}</span>
            <span style="font-size:13px;font-weight:700;color:#ef4444">${c.score}</span>
          </div>
          ${c.resumo ? `<p style="margin:4px 0 0;font-size:12px;color:#64748b">${c.resumo}</p>` : ""}
        </div>
      `,
        )
        .join("")}
    `,
        )
      : "";

  const origensHtml =
    snapshot.origens.length > 0
      ? card(
          "Origens dos leads",
          `
      ${snapshot.origens
        .map(
          (o) => `
        <span style="display:inline-block;margin:3px;background:#1e3a5f;color:#93c5fd;font-size:11px;padding:3px 8px;border-radius:99px">
          ${o.origem}: ${o.total}
        </span>
      `,
        )
        .join("")}
    `,
        )
      : "";

  const corpo = kpisHtml + distHtml + tagsNegHtml + criticasHtml + origensHtml;

  return renderizarBase(
    `Ronda WhatsApp — ${nomeCli}`,
    `${dataInicio} a ${dataFim}`,
    corpo,
    nomeCli,
  );
}

export function renderizarRondaCalls(snapshot: SnapshotCalls, nomeCli: string): string {
  const dataInicio = new Date(snapshot.periodo.inicio).toLocaleDateString("pt-BR");
  const dataFim = new Date(snapshot.periodo.fim).toLocaleDateString("pt-BR");

  if (snapshot.total_calls === 0) {
    return renderizarBase(
      `Ronda Calls — ${nomeCli}`,
      `${dataInicio} a ${dataFim}`,
      `<p style="color:#64748b;font-size:14px">Nenhuma call analisada neste período. Verifique a integração com o Plaud/Zapier.</p>`,
      nomeCli,
    );
  }

  const scoreMediaFormatado = snapshot.score_medio !== null ? snapshot.score_medio.toFixed(1) : "—";
  const scoreCor = snapshot.score_medio !== null ? scoreColor(snapshot.score_medio) : "#64748b";

  const kpisHtml = `
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      ${kpiCard("Calls analisadas", String(snapshot.total_calls), "#0891b2")}
      ${kpiCard("Score médio", scoreMediaFormatado, scoreCor)}
    </div>
  `;

  const classMap: Record<string, string> = {
    excelente: "#10b981",
    bom: "#3b82f6",
    regular: "#f59e0b",
    insuficiente: "#ef4444",
  };
  const classHtml = card(
    "Distribuição por classificação",
    `
    ${snapshot.distribuicao_classificacao
      .map(
        (d) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${classMap[d.classificacao] ?? "#64748b"}"></span>
        <span style="font-size:13px;color:#cbd5e1;flex:1;text-transform:capitalize">${d.classificacao}</span>
        <span style="font-size:13px;font-weight:700;color:#94a3b8">${d.total}</span>
      </div>
    `,
      )
      .join("")}
  `,
  );

  const fasesLabels: Record<string, string> = {
    preparacao: "Preparação",
    abertura: "Abertura",
    diagnostico: "Diagnóstico",
    apresentacao_clinica: "Apresentação clínica",
    apresentacao_investimento: "Apresentação investimento",
    fechamento: "Fechamento",
    objecoes: "Objeções",
    sabotadores: "Sabotadores",
  };
  const fasesEntries = Object.entries(snapshot.media_por_fase)
    .filter(([, v]) => v !== null)
    .sort((a, b) => (a[1] as number) - (b[1] as number));

  const fasesHtml =
    fasesEntries.length > 0
      ? card(
          "Média por fase",
          `
      <table style="width:100%;border-collapse:collapse">
        <tbody>
          ${fasesEntries
            .map(([fase, val]) => {
              const v = val as number;
              return barHtml(fasesLabels[fase] ?? fase, v, 100, scoreColor(v));
            })
            .join("")}
        </tbody>
      </table>
    `,
        )
      : "";

  const insufHtml =
    snapshot.calls_insuficientes.length > 0
      ? card(
          "Calls insuficientes",
          `
      ${snapshot.calls_insuficientes
        .map(
          (c) => `
        <div style="padding:8px 0;border-bottom:1px solid #334155">
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:13px;color:#cbd5e1">${c.lead_nome ?? "Lead sem match"}</span>
            <span style="font-size:13px;font-weight:700;color:#ef4444">${c.score}</span>
          </div>
          ${c.diagnostico ? `<p style="margin:4px 0 0;font-size:12px;color:#64748b">${c.diagnostico}</p>` : ""}
        </div>
      `,
        )
        .join("")}
    `,
        )
      : "";

  const corpo = kpisHtml + classHtml + fasesHtml + insufHtml;

  return renderizarBase(`Ronda Calls — ${nomeCli}`, `${dataInicio} a ${dataFim}`, corpo, nomeCli);
}

function kpiCard(label: string, valor: string, cor: string): string {
  return `
    <div style="background:#0f172a;border-radius:8px;padding:16px;min-width:120px;flex:1">
      <div style="font-size:11px;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">${label}</div>
      <div style="font-size:28px;font-weight:700;color:${cor}">${valor}</div>
    </div>
  `;
}

function renderizarBase(titulo: string, subtitulo: string, corpo: string, nomeCli: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="margin-bottom:24px">
      <h1 style="margin:0;font-size:22px;color:#f1f5f9">${titulo}</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#64748b">${subtitulo}</p>
    </div>
    ${corpo}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #1e293b">
      <p style="margin:0;font-size:11px;color:#475569">
        ${nomeCli} — Atlas OS Comercial
        <br>Você recebeu este email porque está cadastrado como destinatário das rondas semanais.
      </p>
    </div>
  </div>
</body>
</html>`;
}
