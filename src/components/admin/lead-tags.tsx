"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Plus } from "lucide-react";
import { updateLeadTags } from "@/app/actions/admin";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { StatusMessage } from "@/components/ui/status-message";

export function LeadTags({ id, tags }: { id: string; tags: string[] }) {
  const t = useTranslations("admin.leads");
  const { pending, erro, run } = useAdminAction({
    errorMessage: t("updateError"),
    successMessage: t("updateSuccess"),
  });
  const [value, setValue] = useState("");

  function commit(next: string[]) {
    void run(() => updateLeadTags(id, next));
  }

  function addTag(e: React.FormEvent) {
    e.preventDefault();
    const tag = value.trim();
    setValue("");
    if (!tag) return;
    if (tags.some((x) => x.toLowerCase() === tag.toLowerCase())) return;
    commit([...tags, tag]);
  }

  function removeTag(tag: string) {
    commit(tags.filter((x) => x !== tag));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            disabled={pending}
            aria-label={t("removeTag", { tag })}
            className="transition-opacity hover:opacity-70 disabled:opacity-50"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <form onSubmit={addTag} className="inline-flex items-center gap-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          // Nome próprio: o campo e o botão ao lado usavam a MESMA chave, então
          // o leitor anunciava "Adicionar tag, edição" e logo depois
          // "Adicionar tag, botão" — dois controles vizinhos indistinguíveis. E
          // o nome vinha do placeholder, que some ao digitar.
          aria-label={t("newTag")}
          placeholder={t("addTag")}
          maxLength={40}
          className="w-28 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs transition-colors placeholder:text-muted-foreground focus-visible:border-brand"
        />
        <button
          type="submit"
          disabled={pending || !value.trim()}
          aria-label={t("addTag")}
          className="inline-flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
        >
          <Plus className="size-3.5" />
        </button>
      </form>

      <StatusMessage tone="error">{erro}</StatusMessage>
    </div>
  );
}
