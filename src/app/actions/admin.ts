"use server";

import { revalidatePath } from "next/cache";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED: LeadStatus[] = ["NEW", "CONTACTED", "ARCHIVED"];

/** Normalise free-form tag input: trim, drop blanks, dedupe, cap length/count. */
function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().slice(0, 40);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length >= 20) break;
  }
  return result;
}

/** Update a lead's status. Admin-only; verified server-side. */
export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  if (!ALLOWED.includes(status)) return { ok: false };

  try {
    await prisma.lead.update({ where: { id }, data: { status } });
    // O site é só em português e o prefixo padrão é omitido
    // (`localePrefix: "as-needed"`), então existe UM caminho: `/admin/leads`.
    // A chamada para `/en/admin/leads` veio do fork bilíngue e apontava para
    // rota inexistente. Quem de fato atualiza a tela é o `router.refresh()` do
    // componente cliente — esta chamada limpa o cache de rota e é o cinto.
    revalidatePath("/admin/leads");
    return { ok: true };
  } catch (error) {
    console.error("Failed to update lead status", error);
    return { ok: false };
  }
}

/** Replace a lead's tags. Admin-only; verified server-side. */
export async function updateLeadTags(
  id: string,
  tags: string[],
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  if (!Array.isArray(tags)) return { ok: false };

  try {
    await prisma.lead.update({
      where: { id },
      data: { tags: normalizeTags(tags) },
    });
    revalidatePath("/admin/leads");
    return { ok: true };
  } catch (error) {
    console.error("Failed to update lead tags", error);
    return { ok: false };
  }
}
