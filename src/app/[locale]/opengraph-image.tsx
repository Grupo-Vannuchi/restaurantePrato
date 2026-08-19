import { ImageResponse } from "next/og";
import { openingHoursLabel, siteConfig } from "@/config/site";

/**
 * Imagem de compartilhamento padrão de todas as rotas (Open Graph + Twitter).
 *
 * ⚠️ INTERINO em dois eixos: a logo do cliente ainda não chegou (a marca é
 * tipográfica) e a fotografia autoral também não. Quando as fotos chegarem, isto
 * deve virar um prato real com a marca por cima — uma imagem de comida converte
 * muito mais numa prévia de WhatsApp do que um cartão de texto.
 */
export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Nada aqui varia por requisição, então o cartão é assado no build. */
export const dynamic = "force-static";

export default function OpengraphImage() {
  const { background, brand, foreground } = siteConfig.theme.dark;
  const { city, region } = siteConfig.contact.address;
  const hours = openingHoursLabel();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          background,
          color: foreground,
        }}
      >
        <div
          style={{ display: "flex", fontSize: 88, fontWeight: 700, color: brand }}
        >
          {siteConfig.name}
        </div>
        <div style={{ display: "flex", fontSize: 34, opacity: 0.85 }}>
          Buffet e churrasco no Centro de {city}/{region}
        </div>
        {hours ? (
          <div style={{ display: "flex", fontSize: 28, color: brand }}>
            {hours}
          </div>
        ) : null}
      </div>
    ),
    { ...size },
  );
}
