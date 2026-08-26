"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/field";
import { submitContactLead } from "@/app/actions/leads";
import { contactSchema, type ContactInput } from "@/lib/validations/lead";
import { readAttribution } from "@/lib/attribution";

export function ContactForm() {
  const t = useTranslations("contact.form");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const schema = contactSchema({
    nameMin: tv("nameMin"),
    emailInvalid: tv("emailInvalid"),
    messageMin: tv("messageMin"),
    required: tv("required"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(schema) });

  async function onSubmit(data: ContactInput) {
    setStatus("idle");
    try {
      const result = await submitContactLead(
        { ...data, ...readAttribution() },
        locale,
      );
      if (result.ok) {
        reset();
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      // A ação nem chegou a responder: rede caída, servidor reiniciando, deploy
      // no meio da requisição. Sem este ramo, `setStatus("error")` não roda — o
      // react-hook-form devolve `isSubmitting` a false no seu próprio `finally`
      // e relança, então o botão destrava e a tela não muda em nada.
      //
      // Aqui o silêncio custa mais caro que no painel: quem está do outro lado é
      // um cliente escrevendo para o restaurante. Ele vê o botão voltar ao
      // normal, presume que enviou, e vai embora esperando resposta. Ninguém no
      // restaurante fica sabendo que ele existiu.
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center"
      >
        <CheckCircle2 className="size-10 text-brand" />
        <p className="text-pretty">{t("success")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* Honeypot — hidden from humans; bots fill it and get dropped server-side. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] size-0 opacity-0"
        {...register("hp")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">{t("name")}</Label>
          <Input
            id="name"
            autoComplete="name"
            {...register("name")}
            error={errors.name?.message}
          />
        </div>
        <div>
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            error={errors.email?.message}
          />
        </div>
        <div>
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
        </div>
        <div>
          <Label htmlFor="company">{t("company")}</Label>
          <Input
            id="company"
            autoComplete="organization"
            {...register("company")}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="message">{t("message")}</Label>
        <Textarea
          id="message"
          placeholder={t("messagePlaceholder")}
          {...register("message")}
          error={errors.message?.message}
        />
      </div>

      {status === "error" ? (
        <p role="alert" className="text-sm text-red-500">
          {t("error")}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting} className="sm:self-start">
        {isSubmitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
