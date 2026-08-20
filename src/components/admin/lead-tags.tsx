"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X, Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { updateLeadTags } from "@/app/actions/admin";

export function LeadTags({ id, tags }: { id: string; tags: string[] }) {
  const t = useTranslations("admin.leads");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState("");

  function commit(next: string[]) {
    startTransition(async () => {
      await updateLeadTags(id, next);
      router.refresh();
    });
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
    </div>
  );
}
