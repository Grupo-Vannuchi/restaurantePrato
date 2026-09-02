"use client";

import { useEffect, useRef, useState } from "react";
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
  const enviando = useRef(false);
  const confirmacaoRef = useRef<HTMLDivElement | null>(null);

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
    // A contrapartida de trocar `disabled` por `aria-disabled` no botão: o
    // clique continua chegando durante o envio. Sem esta guarda o visitante
    // gera dois leads iguais só por clicar de novo enquanto espera.
    if (enviando.current) return;
    enviando.current = true;
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
    } finally {
      enviando.current = false;
    }
  }

  // Em efeito, e não dentro do `onSubmit`: `setStatus` é agendado, então focar
  // ali levaria a pessoa a um painel que ainda não existe no DOM.
  useEffect(() => {
    if (status !== "success") return;
    confirmacaoRef.current?.focus();
  }, [status]);

  return (
    <>
      {/*
       * A região viva mora AQUI, fora do que a ação destrói, e nasce vazia.
       * `admin-notice.tsx` explica por quê: região viva só é anunciada de forma
       * confiável se já estiver no DOM quando o texto muda. A confirmação
       * antiga era um `<div role="status">` inserido no mesmo commit de render
       * em que o formulário sumia — o antipadrão que o painel já tinha
       * corrigido, repetido no lugar em que o visitante fala com o restaurante.
       *
       * Ela carrega só o progresso. O sucesso é anunciado pelo foco indo para o
       * painel de confirmação: anunciar pelos dois caminhos faria o leitor de
       * tela repetir a mesma frase duas vezes.
       */}
      <p role="status" aria-live="polite" className="sr-only">
        {isSubmitting ? t("submitting") : ""}
      </p>

      {status === "success" ? (
        <div
          ref={confirmacaoRef}
          data-testid="confirmacao-de-envio"
          // O foco vem para cá porque o botão que o tinha foi destruído junto
          // com o formulário: a escolha não é entre mover e não mover, é entre
          // um destino pensado e o `<body>`.
          tabIndex={-1}
          className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center"
        >
          <CheckCircle2 className="size-10 text-brand" />
          <p className="text-pretty">{t("success")}</p>
        </div>
      ) : (
        <form
          // O `handleSubmit(...)` é montado DENTRO do manipulador, e não no
          // render: `onSubmit` lê `enviando.current`, e uma ref lida durante o
          // render é justamente o que a regra de pureza do React proíbe.
          onSubmit={(evento) => handleSubmit(onSubmit)(evento)}
          className="flex flex-col gap-4"
          noValidate
          aria-busy={isSubmitting}
        >
          {/*
           * A legenda existe porque um asterisco sozinho não se explica. Fica
           * ANTES dos campos: depois deles, quem lê em ordem já passou por
           * todas as marcas sem saber o que significavam.
           */}
          <p className="text-xs text-muted-foreground">{t("requiredLegend")}</p>

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
              <Label htmlFor="name" required>
                {t("name")}
              </Label>
              <Input
                id="name"
                required
                autoComplete="name"
                {...register("name")}
                error={errors.name?.message}
              />
            </div>
            <div>
              <Label htmlFor="email" required>
                {t("email")}
              </Label>
              <Input
                id="email"
                required
                type="email"
                autoComplete="email"
                {...register("email")}
                error={errors.email?.message}
              />
            </div>
            <div>
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                {...register("phone")}
              />
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
            <Label htmlFor="message" required>
              {t("message")}
            </Label>
            <Textarea
              id="message"
              required
              placeholder={t("messagePlaceholder")}
              {...register("message")}
              error={errors.message?.message}
            />
          </div>

          {status === "error" ? (
            <p role="alert" className="text-sm text-danger">
              {t("error")}
            </p>
          ) : null}

          {/*
           * `aria-disabled`, e NÃO `disabled`. No Chrome, desabilitar o
           * elemento que tem o foco joga o foco no `<body>` — a pessoa perde o
           * lugar no instante do clique. E a troca de nome de um elemento
           * desabilitado não é anunciada, então "Enviando…" existia só para
           * quem enxerga. Quem impede o envio duplicado agora é a guarda no
           * `onSubmit`.
           */}
          <Button
            type="submit"
            size="lg"
            aria-disabled={isSubmitting}
            className="sm:self-start aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </form>
      )}
    </>
  );
}
