import { Suspense } from "react";
import Image from "next/image";
import { Play, Images } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Section } from "@/components/ui/section";
import { Instagram } from "@/components/ui/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { restaurantDateFormat } from "@/lib/dates";
import { env } from "@/lib/env";
import {
  getInstagramPosts,
  isInstagramConfigured,
  type InstagramPost,
} from "@/lib/instagram";

/**
 * As últimas publicações do Instagram, logo abaixo da galeria.
 *
 * Continuação visual da galeria, não uma seção institucional: sem título
 * grande, sem frase de efeito, cards quase colados. A mídia é o conteúdo — o
 * único texto é o botão no fim.
 *
 * Desktop: quatro quadrados numa linha. Celular: faixa que rola na horizontal
 * com encaixe, porque quatro cards espremidos em 390px viram miniaturas
 * ilegíveis.
 *
 * Não renderiza nada quando a integração está desligada ou quando a Meta não
 * devolveu post algum. O Instagram fora do ar não pode deixar um buraco na
 * home.
 */

/** Quadrado com cantos arredondados — reserva o espaço antes da imagem chegar. */
const cardBase =
  "group relative aspect-square shrink-0 overflow-hidden rounded-2xl bg-muted";

function PostCard({ post, index }: { post: InstagramPost; index: number }) {
  // Pelo ajudante, e nao por `toLocaleDateString`: aquele herda o fuso do
  // processo, que na Vercel e UTC. Uma publicacao do fim da noite aparecia
  // com a data do dia seguinte.
  const data = restaurantDateFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(post.timestamp));

  // A legenda vira o texto alternativo quando existe: descreve a imagem melhor
  // do que qualquer rótulo genérico. Sem legenda, a imagem é decorativa e o
  // link já se anuncia sozinho.
  const alt = post.caption ? post.caption.split("\n")[0].slice(0, 120) : "";

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className={`${cardBase} w-[78%] snap-start sm:w-auto`}
    >
      <Image
        src={post.image}
        alt={alt}
        fill
        // Os dois primeiros aparecem antes da dobra em telas grandes; os demais
        // só quando o visitante chega neles.
        loading={index < 2 ? "eager" : "lazy"}
        sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 78vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />

      {/* Vídeo e álbum ganham marca discreta, como no próprio Instagram. */}
      {post.type !== "IMAGE" ? (
        <span
          aria-hidden
          className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm"
        >
          {post.type === "VIDEO" ? (
            <Play className="size-3.5 fill-current" />
          ) : (
            <Images className="size-3.5" />
          )}
        </span>
      ) : null}

      {/* Legenda e data ao passar o mouse ou focar pelo teclado. No celular não
          há hover, e o card leva direto ao post — que é onde a legenda está. */}
      {post.caption ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
          <p className="line-clamp-2 text-sm leading-snug text-white">
            {post.caption}
          </p>
          <p className="mt-1 text-xs text-white/70">{data}</p>
        </div>
      ) : null}
    </a>
  );
}

/** Quadrados vazios para conferir o layout enquanto não há credenciais. */
function PreviewCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className={`${cardBase} flex w-[78%] snap-start items-center justify-center border border-dashed border-border sm:w-auto`}
        >
          <Instagram className="size-8 text-muted-foreground/40" />
        </div>
      ))}
    </>
  );
}

/** A faixa: mesma classe para grade, skeleton e preview, para as três terem
    exatamente a mesma altura e nada saltar quando o feed chega. */
const faixa =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4";

/**
 * Busca os posts. Isolado num componente próprio porque é a única parte lenta
 * da seção — envolvido em `Suspense` pela seção, ele deixa a home aparecer na
 * hora e chega depois, em vez de segurar a página inteira esperando a Meta.
 */
async function FeedGrid() {
  const posts = await getInstagramPosts();
  if (posts === null || posts.length === 0) return null;

  return (
    <ul className={faixa}>
      {posts.map((post, i) => (
        <li key={post.id} className="contents">
          <PostCard post={post} index={i} />
        </li>
      ))}
    </ul>
  );
}

/** Quadrados na mesma proporção dos cards, enquanto a Meta responde. */
function FeedSkeleton({ count }: { count: number }) {
  return (
    <ul className={faixa} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className={`${cardBase} w-[78%] shrink-0 animate-pulse sm:w-auto`}
        />
      ))}
    </ul>
  );
}

export async function InstagramFeed() {
  const t = await getTranslations("instagram");
  const perfil = siteConfig.social.instagram;
  if (!perfil) return null;

  // Fora de produção, com a integração desligada, desenha quadros vazios só
  // para validar espaçamento e responsividade. Em produção isso nunca acontece.
  const preview = !isInstagramConfigured() && env.INSTAGRAM_PREVIEW;

  // Decidido aqui, e não dentro do Suspense: sem credenciais a seção não deve
  // nem piscar um skeleton antes de sumir. `isInstagramConfigured` lê variável
  // de ambiente, não vai à rede — dá para chamar antes de renderizar.
  if (!preview && !isInstagramConfigured()) return null;

  return (
    <Section className="pt-0">
      {preview ? (
        <ul className={faixa}>
          <PreviewCards count={env.INSTAGRAM_POST_LIMIT} />
        </ul>
      ) : (
        <Suspense fallback={<FeedSkeleton count={env.INSTAGRAM_POST_LIMIT} />}>
          <FeedGrid />
        </Suspense>
      )}

      <div className="mt-8 flex justify-center">
        <a
          href={perfil}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          <Instagram className="size-4" aria-hidden />
          {t("follow")}
        </a>
      </div>
    </Section>
  );
}
