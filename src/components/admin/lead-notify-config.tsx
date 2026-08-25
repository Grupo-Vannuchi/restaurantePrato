"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { listInstancesAction } from "@/app/actions/whatsapp";
import {
  getLeadNotifyConfig,
  saveLeadNotifyConfig,
  listGroupsAction,
} from "@/app/actions/lead-notify";
import type { EvoGroup, EvoInstance } from "@/lib/evolution";

const selectStyles =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:border-brand disabled:opacity-60";

type Status = "loading" | "ok" | "error";

/**
 * Admin panel (top of /admin/leads): pick an Evolution instance + a WhatsApp
 * group and toggle automatic lead notifications. Everything loads client-side so
 * the slow Evolution calls never block the leads page.
 */
export function LeadNotifyConfig() {
  const t = useTranslations("admin.leadNotify");

  const [enabled, setEnabled] = useState(false);
  const [instance, setInstance] = useState("");
  const [groupId, setGroupId] = useState("");

  const [instances, setInstances] = useState<EvoInstance[]>([]);
  const [instStatus, setInstStatus] = useState<Status>("loading");
  const [groups, setGroups] = useState<EvoGroup[]>([]);
  const [groupStatus, setGroupStatus] = useState<Status>("loading");

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadGroups = useCallback((inst: string) => {
    if (!inst) {
      setGroups([]);
      setGroupStatus("ok");
      return;
    }
    setGroupStatus("loading");
    listGroupsAction(inst)
      .then((r) => {
        if (r.ok) {
          setGroups(r.data);
          setGroupStatus("ok");
        } else setGroupStatus("error");
      })
      .catch(() => setGroupStatus("error"));
  }, []);

  // Load current config + the instance list on mount, then this instance's groups.
  useEffect(() => {
    let active = true;
    getLeadNotifyConfig().then((c) => {
      if (!active || "error" in c) return;
      setEnabled(c.enabled);
      setInstance(c.instance);
      setGroupId(c.groupId);
      if (c.instance) loadGroups(c.instance);
      else setGroupStatus("ok");
    });
    listInstancesAction()
      .then((r) => {
        if (!active) return;
        if (r.ok) {
          setInstances(r.data);
          setInstStatus("ok");
        } else setInstStatus("error");
      })
      .catch(() => active && setInstStatus("error"));
    return () => {
      active = false;
    };
  }, [loadGroups]);

  function onInstanceChange(value: string) {
    setInstance(value);
    setGroupId("");
    loadGroups(value);
  }

  const selectedState = instances.find((i) => i.name === instance)?.state;
  const instanceDisconnected =
    Boolean(instance) && selectedState !== undefined && selectedState !== "open";

  async function onSave() {
    setNotice(null);
    setSaving(true);
    const groupName = groups.find((g) => g.id === groupId)?.name ?? "";
    try {
      const res = await saveLeadNotifyConfig({ enabled, instance, groupId, groupName });
      setNotice(res.ok ? t("saved") : t(`error.${res.error}` as "error.missing_target"));
    } catch {
      // Os dois carregamentos deste painel já se protegiam com `.catch()` —
      // quem o escreveu sabia que a Evolution cai. O salvar tinha ficado de
      // fora, e a rejeição deixava `setSaving(false)` para trás: o botão
      // travava em "Salvando…" sem aviso e sem forma de tentar de novo.
      setNotice(t("error.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-5 text-brand" />
        <h2 className="font-semibold">{t("title")}</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("hint")}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ln-instance">{t("instance")}</Label>
          <select
            id="ln-instance"
            className={selectStyles}
            value={instance}
            disabled={instStatus === "loading"}
            onChange={(e) => onInstanceChange(e.target.value)}
          >
            <option value="">{t("selectInstance")}</option>
            {instance && !instances.some((i) => i.name === instance) ? (
              <option value={instance}>{instance}</option>
            ) : null}
            {instances.map((i) => (
              <option key={i.name} value={i.name}>
                {i.name}
                {i.state !== "open" ? ` — ${t("disconnected")}` : ""}
              </option>
            ))}
          </select>
          {instStatus === "loading" ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              {t("loadingInstances")}
            </p>
          ) : instStatus === "error" ? (
            <p className="mt-1 text-xs text-amber-600">{t("instancesError")}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="ln-group">{t("group")}</Label>
          <select
            id="ln-group"
            className={selectStyles}
            value={groupId}
            disabled={!instance || groupStatus === "loading"}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">{t("selectGroup")}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {groupStatus === "loading" ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              {t("loadingGroups")}
            </p>
          ) : groupStatus === "error" ? (
            <p className="mt-1 text-xs text-amber-600">
              {instanceDisconnected ? t("instanceDisconnected") : t("groupsError")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-brand"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          {t("enable")}
        </label>
        <div className="flex items-center gap-3">
          {notice ? (
            <span
              className={cn(
                "text-xs",
                notice === t("saved") ? "text-emerald-600" : "text-red-500",
              )}
            >
              {notice}
            </span>
          ) : null}
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
