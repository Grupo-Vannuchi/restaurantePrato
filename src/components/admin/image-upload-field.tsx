"use client";

import { useRef, useState } from "react";
import { UploadCloud, Loader2, X, ImageIcon } from "lucide-react";
import { Input, Label } from "@/components/ui/field";
import { uploadImageAction } from "@/app/actions/upload";
import type { ImagePreset } from "@/lib/storage";
import { useTranslations } from "next-intl";

type ErrorKey =
  | "tooLarge"
  | "notImage"
  | "notConfigured"
  | "bucketNotFound"
  | "error";
function errorKey(error: string): ErrorKey {
  if (error === "too_large") return "tooLarge";
  if (error === "not_image") return "notImage";
  if (error === "not_configured") return "notConfigured";
  if (error === "bucket_not_found") return "bucketNotFound";
  return "error";
}

/**
 * Admin image field: upload a file (processed to a standard WebP in Supabase
 * Storage) OR paste an image URL (hybrid — legacy/external URLs still work).
 * Controlled via `value`/`onChange` so it plugs into react-hook-form with
 * `watch()` + `setValue()`.
 */
export function ImageUploadField({
  id,
  label,
  hint,
  preset,
  value,
  onChange,
  error: erroDeValidacao,
}: {
  id?: string;
  label?: string;
  hint?: string;
  preset: ImagePreset;
  value: string;
  onChange: (url: string) => void;
  /** Erro de validação do formulário — separado da falha de ENVIO, abaixo. */
  error?: string;
}) {
  const t = useTranslations("admin.upload");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("preset", preset);
      const res = await uploadImageAction(fd);
      if (res.ok) onChange(res.url);
      else setError(t(errorKey(res.error)));
    } catch {
      // A ação nem chegou a responder: acima do teto de corpo da requisição
      // (16 MB) o Next recusa antes de executá-la, e queda de rede dá no mesmo.
      // Foto de celular passa de 16 MB com facilidade, então este caminho é
      // rotina, não exceção.
      setError(t("error"));
    } finally {
      // Em `finally`, não no caminho feliz: sem isto o botão ficava girando
      // "Enviando…" para sempre, e o campo de arquivo continuava apontando
      // para a foto escolhida — reescolher a MESMA não dispara `change`, então
      // nem tentar de novo era possível.
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <div className="mt-1 flex items-start gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => onChange("")}
                aria-label={t("remove")}
                className="absolute right-0.5 top-0.5 inline-flex size-5 items-center justify-center rounded-md bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:text-red-600"
              >
                <X className="size-3.5" />
              </button>
            </>
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon className="size-6" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:border-brand disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UploadCloud className="size-4" />
            )}
            {uploading ? t("uploading") : value ? t("replace") : t("upload")}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Input
            id={id}
            type="url"
            placeholder={t("urlPlaceholder")}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            hint={hint}
            // Dois erros diferentes no mesmo campo: o que o formulário reprovou
            // e o que o envio da imagem devolveu. O de envio vem primeiro
            // porque é o mais recente — foi a última coisa que a pessoa fez.
            error={error ?? erroDeValidacao}
          />
        </div>
      </div>
    </div>
  );
}
