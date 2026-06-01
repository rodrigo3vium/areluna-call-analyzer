"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Instance = {
  id: string;
  apelido: string;
  evolution_url: string;
  evolution_api_key: string;
  instance_name: string;
  webhook_secret: string;
  ativa: boolean;
};

type FormState = Omit<Instance, "id" | "ativa">;

const EMPTY: FormState = {
  apelido: "",
  evolution_url: "",
  evolution_api_key: "",
  instance_name: "",
  webhook_secret: "",
};

export function EvolutionInstancesPanel({ instances }: { instances: Instance[] }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [testando, setTestando] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(
    null,
  );
  const router = useRouter();

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/evolution-instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm(EMPTY);
      setShowForm(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function toggleAtiva(inst: Instance) {
    await fetch(`/api/evolution-instances/${inst.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativa: !inst.ativa }),
    });
    router.refresh();
  }

  async function deletar(id: string) {
    if (!confirm("Remover esta instância?")) return;
    await fetch(`/api/evolution-instances/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function testar(inst: Instance) {
    setTestando(inst.id);
    setTestResult(null);
    try {
      const res = await fetch("/api/configuracoes/testar-evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evolution_url: inst.evolution_url,
          evolution_api_key: inst.evolution_api_key,
          instance_name: inst.instance_name,
        }),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      setTestResult({ id: inst.id, ok: data.ok, msg: data.message });
    } catch {
      setTestResult({ id: inst.id, ok: false, msg: "Erro de rede" });
    } finally {
      setTestando(null);
    }
  }

  function inputField(key: keyof FormState, label: string, type = "text") {
    return (
      <div className="space-y-1">
        <Label className="text-[10px] text-slate-500">{label}</Label>
        <Input
          type={type}
          value={form[key]}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
          className="h-7 border-slate-700 bg-slate-900 text-xs"
          required
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {instances.length === 0 && !showForm && (
        <p className="text-xs text-slate-500">Nenhuma instância configurada.</p>
      )}

      {instances.map((inst) => (
        <div key={inst.id} className="space-y-1.5 rounded-lg border border-slate-700 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">{inst.apelido}</p>
              <p className="text-[10px] text-slate-500">
                {inst.instance_name} — {inst.evolution_url}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${inst.ativa ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-600/40 text-slate-400"}`}
              >
                {inst.ativa ? "ativa" : "inativa"}
              </span>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={() => testar(inst)}
              disabled={testando === inst.id}
            >
              {testando === inst.id ? "Testando…" : "Testar conexão"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px]"
              onClick={() => toggleAtiva(inst)}
            >
              {inst.ativa ? "Desativar" : "Ativar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300"
              onClick={() => deletar(inst.id)}
            >
              Remover
            </Button>
          </div>
          {testResult?.id === inst.id && (
            <p className={`text-[10px] ${testResult.ok ? "text-emerald-400" : "text-red-400"}`}>
              {testResult.msg}
            </p>
          )}
        </div>
      ))}

      {showForm ? (
        <form
          onSubmit={criar}
          className="space-y-2 rounded-lg border border-slate-600 bg-slate-800/40 p-3"
        >
          <p className="text-xs font-medium text-slate-300">Nova instância Evolution</p>
          {inputField("apelido", "Apelido (ex: WhatsApp Principal)")}
          {inputField("evolution_url", "URL da Evolution API")}
          {inputField("evolution_api_key", "API Key", "password")}
          {inputField("instance_name", "Nome da instância")}
          {inputField("webhook_secret", "Webhook Secret", "password")}
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" className="h-7 text-xs" disabled={loading}>
              {loading ? "Criando…" : "Criar"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => setShowForm(true)}
        >
          + Adicionar instância
        </Button>
      )}
    </div>
  );
}
