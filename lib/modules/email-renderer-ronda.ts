import type { SnapshotCalls } from "@/lib/types";

function scoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#3b82f6";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
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

function kpiCard(label: string, valor: string, cor: string): string {
  return `
    <div style="background:#0f172a;border-radius:8px;padding:16px;min-width:120px;flex:1">
      <div style="font-size:11px;color:#64748b;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">${label}</div>
      <div style="font-size:28px;font-weight:700;color:${cor}">${valor}</div>
    </div>
  `;
}

export function renderizarRondaCalls(snapshot: SnapshotCalls, nomeCli: string): string {
  // Periodo vem do snapshot apenas via metadados externos — recebido em gerador-ronda
  // A função aceita datas opcionais para o subtítulo
  const titulo = `Ronda Calls — ${nomeCli}`;

  if (snapshot.total_calls === 0) {
    return renderizarBase(
      titulo,
      `<p style="color:#64748b;font-size:14px">Nenhuma call analisada neste período. Verifique se novos arquivos estão sendo detectados no SharePoint.</p>`,
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
    EXCELENTE: "#10b981",
    BOM: "#3b82f6",
    REGULAR: "#f59e0b",
    INSUFICIENTE: "#ef4444",
  };
  const classHtml = card(
    "Distribuição por classificação",
    Object.entries(snapshot.distribuicao_classificacao)
      .map(
        ([cls, total]) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${classMap[cls] ?? "#64748b"}"></span>
        <span style="font-size:13px;color:#cbd5e1;flex:1">${cls.charAt(0) + cls.slice(1).toLowerCase()}</span>
        <span style="font-size:13px;font-weight:700;color:#94a3b8">${total}</span>
      </div>
    `,
      )
      .join(""),
  );

  const maxCloser = Math.max(...snapshot.por_closer.map((c) => c.total), 1);
  const closerHtml =
    snapshot.por_closer.length > 0
      ? card(
          "Performance por closer",
          `<table style="width:100%;border-collapse:collapse"><tbody>
            ${snapshot.por_closer
              .map((c) =>
                barHtml(
                  c.closer_nome,
                  c.total,
                  maxCloser,
                  c.score_medio !== null ? scoreColor(c.score_medio) : "#64748b",
                ),
              )
              .join("")}
          </tbody></table>`,
        )
      : "";

  const insufHtml =
    snapshot.calls_insuficientes.length > 0
      ? card(
          "Calls insuficientes",
          snapshot.calls_insuficientes
            .map(
              (c) => `
          <div style="padding:8px 0;border-bottom:1px solid #334155">
            <div style="display:flex;justify-content:space-between">
              <span style="font-size:13px;color:#cbd5e1">${c.closer_nome ?? "Closer não identificado"}</span>
              <span style="font-size:13px;font-weight:700;color:#ef4444">${c.score ?? "—"}</span>
            </div>
            ${c.diagnostico_ia ? `<p style="margin:4px 0 0;font-size:12px;color:#64748b">${c.diagnostico_ia}</p>` : ""}
          </div>
        `,
            )
            .join(""),
        )
      : "";

  return renderizarBase(titulo, kpisHtml + classHtml + closerHtml + insufHtml, nomeCli);
}

function renderizarBase(titulo: string, corpo: string, nomeCli: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="margin-bottom:24px">
      <h1 style="margin:0;font-size:22px;color:#f1f5f9">${titulo}</h1>
    </div>
    ${corpo}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #1e293b">
      <p style="margin:0;font-size:11px;color:#475569">
        ${nomeCli} — Areluna Call Analyzer
        <br>Você recebeu este email porque está cadastrado como destinatário das rondas semanais.
      </p>
    </div>
  </div>
</body>
</html>`;
}
