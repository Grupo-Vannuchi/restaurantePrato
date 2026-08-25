"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, RefreshCw, QrCode, LogOut, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { EvoInstance } from "@/lib/evolution";
import {
  listInstancesAction,
  createInstanceAction,
  connectInstanceAction,
  connectionStateAction,
  logoutInstanceAction,
  deleteInstanceAction,
} from "@/app/actions/whatsapp";

type Qr = { instance: string; base64: string | null };

/**
 * Executa uma chamada à Evolution sem deixar a rejeição escapar.
 *
 * As seis ações deste painel vão para um servidor EXTERNO, que fica fora do ar
 * de verdade — não é hipótese. Sem isto, cada uma quebrava de um jeito próprio:
 * a listagem prendia o painel no esqueleto animado para sempre, criar e conectar
 * travavam o botão em "Criando…", e a checagem do QR (a cada 3 segundos) virava
 * rejeição não tratada em looping.
 *
 * Devolver `null` faz o chamador tratar "não respondeu" e "respondeu que não deu"
 * pelo mesmo caminho — `!res?.ok` —, que é o que se quer: para quem olha a tela,
 * os dois são a mesma coisa.
 */
async function semEstourar<T>(acao: () => Promise<T>): Promise<T | null> {
  try {
    return await acao();
  } catch {
    return null;
  }
}

const STATE_STYLES: Record<string, string> = {
  open: "bg-emerald-500/10 text-emerald-600",
  connecting: "bg-amber-500/10 text-amber-600",
  close: "bg-muted text-muted-foreground",
};

export function WhatsappManager({
  defaultInstance,
}: {
  defaultInstance: string | null;
}) {
  const t = useTranslations("admin.whatsapp");
  const [instances, setInstances] = useState<EvoInstance[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [qr, setQr] = useState<Qr | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Always read fresh on the management screen (bypass the 60s cache) — the admin
  // is here to see current connection state.
  async function refresh() {
    setStatus("loading");
    const res = await semEstourar(() => listInstancesAction(true));
    if (res?.ok) {
      setInstances(res.data);
      setStatus("ok");
    } else {
      setStatus("error");
    }
  }

  // Load the list client-side so a slow Evolution server never blocks the page.
  useEffect(() => {
    let active = true;
    semEstourar(() => listInstancesAction(true)).then((res) => {
      if (!active) return;
      if (res?.ok) {
        setInstances(res.data);
        setStatus("ok");
      } else {
        setStatus("error");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // While a QR is shown, poll the connection state; close + refresh once linked.
  useEffect(() => {
    if (!qr) return;
    const id = setInterval(async () => {
      const res = await semEstourar(() => connectionStateAction(qr.instance));
      if (res?.ok && res.data === "open") {
        setQr(null);
        await refresh();
      }
    }, 3000);
    return () => clearInterval(id);
  }, [qr]);

  async function onCreate() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    setBusy("create");
    const res = await semEstourar(() => createInstanceAction(name));
    setBusy(null);
    if (!res?.ok) return setError(t("createError"));
    setNewName("");
    setQr({ instance: name, base64: res.data.base64 });
    await refresh();
  }

  async function onConnect(name: string) {
    setError(null);
    setBusy(name);
    const res = await semEstourar(() => connectInstanceAction(name));
    setBusy(null);
    if (!res?.ok) return setError(t("connectError"));
    setQr({ instance: name, base64: res.data.base64 });
  }

  async function onLogout(name: string) {
    if (!confirm(t("confirmLogout", { name }))) return;
    setError(null);
    setBusy(name);
    const res = await semEstourar(() => logoutInstanceAction(name));
    setBusy(null);
    if (!res?.ok) return setError(t("logoutError"));
    await refresh();
  }

  async function onDelete(name: string) {
    if (!confirm(t("confirmDelete", { name }))) return;
    setError(null);
    setBusy(name);
    const res = await semEstourar(() => deleteInstanceAction(name));
    setBusy(null);
    if (!res?.ok) return setError(t("deleteError"));
    await refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Create */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">{t("createTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("createHint")}</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>
          <Button onClick={onCreate} disabled={busy === "create" || !newName.trim()}>
            <Plus className="size-4" />
            {busy === "create" ? t("creating") : t("create")}
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {/* List */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{t("listTitle")}</h2>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="size-4" />
            {t("refresh")}
          </button>
        </div>

        {status === "loading" ? (
          <>
            <span className="sr-only">{t("loadingInstances")}</span>
            <ul
              aria-hidden
              className="flex flex-col divide-y divide-border"
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
                </li>
              ))}
            </ul>
          </>
        ) : status === "error" ? (
          <p className="text-sm text-amber-600">{t("loadError")}</p>
        ) : instances.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {instances.map((inst) => {
              const state = STATE_STYLES[inst.state] ? inst.state : "close";
              return (
              <li
                key={inst.name}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{inst.name}</span>
                    {inst.name === defaultInstance ? (
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                        {t("badgeDefault")}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        STATE_STYLES[state],
                      )}
                    >
                      {t(`state_${state}` as "state_open")}
                    </span>
                  </div>
                  {inst.number ? (
                    <p className="text-sm text-muted-foreground">
                      +{inst.number}
                      {inst.profileName ? ` · ${inst.profileName}` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {inst.state !== "open" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onConnect(inst.name)}
                      disabled={busy === inst.name}
                    >
                      <QrCode className="size-4" />
                      {t("connect")}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onLogout(inst.name)}
                      disabled={busy === inst.name}
                    >
                      <LogOut className="size-4" />
                      {t("logout")}
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(inst.name)}
                    disabled={busy === inst.name}
                    aria-label={t("delete")}
                    className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* QR modal */}
      {qr ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center">
            <button
              type="button"
              onClick={() => setQr(null)}
              aria-label={t("close")}
              className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
            <h3 className="text-lg font-bold">{t("scanTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("scanHint", { name: qr.instance })}
            </p>
            {qr.base64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr.base64}
                alt="QR code"
                className="mx-auto mt-4 size-64 rounded-lg bg-white p-2"
              />
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">{t("noQr")}</p>
            )}
            <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="size-3 animate-spin" />
              {t("waiting")}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
