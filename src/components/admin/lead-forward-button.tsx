"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Send, Loader2, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { forwardLeadAction } from "@/app/actions/lead-notify";
import { StatusMessage } from "@/components/ui/status-message";

function errorKey(error: string): "notConfigured" | "sendFailed" {
  return error === "not_configured" ? "notConfigured" : "sendFailed";
}

/** Manually (re)send a lead to the sales WhatsApp group. Refreshes on success so
 * the "✓ WhatsApp" badge appears. */
export function LeadForwardButton({ id }: { id: string }) {
  const t = useTranslations("admin.leadNotify");
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    setErr(null);
    setState("sending");
    try {
      const res = await forwardLeadAction(id);
      if (res.ok) {
        setState("sent");
        router.refresh();
      } else {
        setState("error");
        setErr(t(`error.${errorKey(res.error)}` as "error.sendFailed"));
      }
    } catch {
      // A ação nem chegou a responder. Este botão fala com a Evolution, que é
      // um servidor EXTERNO e cai de verdade — sem este ramo o botão ficava
      // travado em "enviando" para sempre, e a rejeição subia para o error
      // boundary em vez de virar aviso.
      setState("error");
      setErr(t("error.sendFailed"));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={state === "sending"}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-brand hover:text-foreground disabled:opacity-60"
      >
        {state === "sending" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : state === "sent" ? (
          <Check className="size-4 text-success" />
        ) : (
          <Send className="size-4" />
        )}
        {t("forward")}
      </button>
      <StatusMessage tone="error">{err}</StatusMessage>
    </div>
  );
}
