import "server-only";
import { prisma } from "@/lib/prisma";
import { sendToGroup } from "@/lib/evolution";
import { normalizePhoneBR, toWhatsappNumber } from "@/lib/phone";
import { sourceLabel } from "@/lib/attribution";
import { restaurantDateFormat } from "@/lib/dates";

/**
 * Pushes a new (or manually forwarded) site lead to the sales WhatsApp group via
 * Evolution. Best-effort: never throws, and the lead itself is already persisted
 * by the caller, so a WhatsApp failure never affects lead capture. The message
 * is Portuguese (the internal sales team) — no i18n needed.
 */

export type LeadForNotify = {
  id: string;
  type: "CONTACT";
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string;
  referrer: string | null;
  landingPage: string | null;
  landingLabel: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: Date;
};

export type NotifyResult = { ok: true } | { ok: false; error: string };

// Era o único lugar que fixava o fuso, e fixava por literal. Agora bebe da
// mesma fonte que o painel, para as duas superfícies nunca mais divergirem.
const dateFmt = restaurantDateFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

/** Build the organized WhatsApp message for a lead: labeled fields, then the
 * message body. */
export function formatLeadMessage(
  lead: LeadForNotify,
  opts: { manual?: boolean } = {},
): string {
  const header = opts.manual ? "📋 Lead encaminhado" : "🔔 Novo lead";
  const lines = [
    `${header} — Contato`,
    "━━━━━━━━━━━━━━━",
    `👤 Nome: ${lead.name}`,
    `📧 E-mail: ${lead.email}`,
  ];
  if (lead.phone) lines.push(`📱 Telefone: ${lead.phone}`);
  if (lead.company) lines.push(`🏢 Empresa: ${lead.company}`);
  lines.push("", "💬 Mensagem:", lead.message.trim());

  // Attribution — how the lead found us.
  lines.push(
    "",
    `📍 Origem: ${sourceLabel({
      referrer: lead.referrer ?? undefined,
      utmSource: lead.utmSource ?? undefined,
    })}`,
  );
  const landing = lead.landingLabel ?? lead.landingPage;
  if (landing) lines.push(`🔗 Entrou por: ${landing}`);
  if (lead.utmCampaign) lines.push(`🏷️ Campanha: ${lead.utmCampaign}`);

  lines.push("", `🕓 ${dateFmt.format(lead.createdAt)}`);

  const e164 = lead.phone ? normalizePhoneBR(lead.phone) : null;
  if (e164) lines.push(`↩️ Responder: https://wa.me/${toWhatsappNumber(e164)}`);

  return lines.join("\n");
}

/**
 * Send the lead to the configured sales group, if lead notifications are enabled
 * and configured. On success, stamps `whatsappNotifiedAt` (drives the badge).
 */
export async function notifyLead(
  lead: LeadForNotify,
  opts: { manual?: boolean } = {},
): Promise<NotifyResult> {
  const config = await prisma.leadNotificationConfig.findFirst();
  // A target (instance + group) is always required; the `enabled` toggle only
  // gates the AUTOMATIC send — a manual forward works as long as it's configured.
  if (!config?.instance || !config.groupId) {
    return { ok: false, error: "not_configured" };
  }
  if (!opts.manual && !config.enabled) {
    return { ok: false, error: "disabled" };
  }

  const res = await sendToGroup(
    config.instance,
    config.groupId,
    formatLeadMessage(lead, opts),
  );
  if (!res.ok) return res;

  try {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { whatsappNotifiedAt: new Date() },
    });
  } catch (err) {
    // The message went out; failing to stamp the badge is non-fatal.
    console.error("Failed to stamp lead whatsappNotifiedAt", err);
  }
  return { ok: true };
}
