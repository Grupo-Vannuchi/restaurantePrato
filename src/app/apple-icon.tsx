import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

// Ícone de toque do iOS (tela de início). 180×180 é o tamanho recomendado pela
// Apple; o iOS aplica a própria máscara arredondada, então o campo cheio
// funciona bem. Mesma marca interina e mesmo motivo de `src/app/icon.tsx`.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const { background, brand } = siteConfig.theme.dark;

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
          fontSize: 106,
          fontWeight: 700,
        }}
      >
        {siteConfig.name.replace(/^Restaurante\s+/i, "").charAt(0)}
      </div>
    ),
    { ...size },
  );
}
