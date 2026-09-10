// Registers @testing-library/jest-dom matchers (e.g. toBeInTheDocument) on
// Vitest's expect, and pulls in their type augmentation for the typechecker.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Unmount the rendered tree after each test (we don't use Vitest globals, so
// RTL's automatic afterEach cleanup isn't auto-registered).
afterEach(() => cleanup());

// jsdom doesn't implement scrollIntoView; stub it so components that autoscroll
// don't throw during tests.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

/*
 * O jsdom também não implementa `matchMedia`, e componentes que perguntam ao
 * sistema por `prefers-reduced-motion` quebram sem ele — o carrossel das massas
 * foi o primeiro.
 *
 * O padrão devolvido é `matches: false`, que significa "pode animar": é o
 * estado da maioria dos visitantes, e o que o componente assume enquanto não
 * consegue perguntar. Um teste que precise do outro caso substitui isto.
 */
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
