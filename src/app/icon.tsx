import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

/**
 * Ícone do app (favicon / aba / PWA), gerado no build.
 *
 * ⚠️ INTERINO: sem a logo do cliente, o ícone é a inicial do nome sobre o fundo
 * escuro da marca. Campo cheio de cor para que o recorte maskable do Android
 * nunca morda transparência. Volta a ser o símbolo da logo no PR 2.
 */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  // Fundo da marca com a marca em off white: um ícone chapado de branco
  // some na tela inicial do telefone.
  const { brand: background, brandForeground: brand } = siteConfig.theme;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background,
          color: brand,
          fontSize: 300,
          fontWeight: 700,
        }}
      >
        {siteConfig.name.replace(/^Restaurante\s+/i, "").charAt(0)}
      </div>
    ),
    { ...size },
  );
}
