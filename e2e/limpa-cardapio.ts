import { limpar } from "./semeia-cardapio";

/** Desfaz a semeadura do `globalSetup`. Ver `semeia-cardapio.ts`. */
export default async function limpaCardapio() {
  await limpar();
}
