import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * Next.js 16 renamed the `middleware` convention to `proxy` (Node.js runtime).
 * Here it drives next-intl locale negotiation and prefixing. Admin authorization
 * is enforced server-side in the admin layout's Data Access Layer
 * (`requireAdmin`), not here.
 */
const handle = createMiddleware(routing);

export default handle;

export const config = {
  // Run on every path except API routes, Next internals, files with an
  // extension (images, fonts, etc.) and the extensionless metadata routes.
  //
  // `icon` and `apple-icon` are named one by one for the case where they are
  // GENERATED routes (`src/app/icon.tsx`): those live at the app root, outside
  // `[locale]/`, on URLs that carry no dot — so the `.*\..*` clause never
  // covered them, and without the exception next-intl rewrote `/icon` to
  // `/pt/icon`, which matches no route. Every page's `<link rel="icon">` then
  // pointed at a 404 and the browser tab showed no logo. The metadata routes
  // that DO have an extension (`robots.txt`, `sitemap.xml`,
  // `manifest.webmanifest`) were always fine, which is what kept it hidden.
  // Next's own docs spell out the rule: "If using along with `proxy.ts`,
  // configure the matcher to exclude the metadata files."
  //
  // ⚠️ **Today the three icons are STATIC files, so these two exceptions match
  // nothing — and that is the whole lesson, not dead config.** `icon.png`,
  // `apple-icon.png` and `opengraph-image.jpg` answer on dotted URLs, already
  // exempt. The dot is also why the share card had to MOVE to the app root on
  // 11/09: a dotted route inside `[locale]/` is unreachable, because the clause
  // that saves the icons is the same clause that denies it the rewrite it would
  // need. The exceptions stay as the safety net for going back to generators —
  // the `$` anchors keep them to the icon routes themselves, so a future page
  // whose slug merely starts with "icon" still gets localized.
  // `e2e/metadata-routes.spec.ts` is the regression guard, and since 11/09 it
  // fetches the URL the page publishes instead of a path typed into the test.
  matcher: ["/((?!api|_next|_vercel|icon$|apple-icon$|.*\\..*).*)"],
};
