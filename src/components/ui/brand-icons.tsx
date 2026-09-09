import { createLucideIcon, type IconNode } from "lucide-react";

/**
 * Self-hosted brand icons.
 *
 * lucide-react v1 removed all brand/logo icons (Instagram, LinkedIn, Facebook,
 * …) — bundling third-party trademarks in a generic icon set is a legal
 * liability the project chose to shed. Owning our brand assets locally is the
 * pattern lucide now recommends, so we recreate them here with lucide's own
 * (still-exported) `createLucideIcon` factory and the exact ISC-licensed path
 * data from lucide-react 0.469.0 — identical rendering, drop-in `LucideIcon`
 * type, no dependency on icons the library no longer ships.
 */

const instagramNode: IconNode = [
  ["rect", { width: "20", height: "20", x: "2", y: "2", rx: "5", ry: "5", key: "2e1cvw" }],
  ["path", { d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z", key: "9exkf1" }],
  ["line", { x1: "17.5", x2: "17.51", y1: "6.5", y2: "6.5", key: "r4j83e" }],
];

const linkedinNode: IconNode = [
  [
    "path",
    {
      d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z",
      key: "c2jq9f",
    },
  ],
  ["rect", { width: "4", height: "12", x: "2", y: "9", key: "mk3on5" }],
  ["circle", { cx: "4", cy: "4", r: "2", key: "bt5ra8" }],
];

const facebookNode: IconNode = [
  [
    "path",
    { d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z", key: "1jg4f8" },
  ],
];

/*
 * O "G" do Google, desenhado com o mesmo traço dos outros — arco aberto mais a
 * barra horizontal. Não é a marca colorida oficial, e isso é escolha: no rodapé
 * ele divide a linha com o Instagram, e um ícone colorido ao lado de um
 * monocromático destoaria mais do que a diferença de forma.
 */
const googleNode: IconNode = [
  ["path", { d: "M20 12a8 8 0 1 1-2.34-5.66", key: "g-arc" }],
  ["path", { d: "M20 12h-8", key: "g-bar" }],
];

export const Instagram = createLucideIcon("Instagram", instagramNode);
export const Google = createLucideIcon("Google", googleNode);
export const Linkedin = createLucideIcon("Linkedin", linkedinNode);
export const Facebook = createLucideIcon("Facebook", facebookNode);
