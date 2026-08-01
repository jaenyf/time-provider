// Lazily creates a single shared Shiki highlighter for runtime (client-side) syntax
// highlighting of dynamically generated TypeScript snippets - the Playground's "equivalent
// code" and the home page's showcase panels, neither of which exist as static markdown that
// VitePress's own build-time Shiki pass could highlight. Uses the same two themes VitePress
// itself renders every fenced code block with, so these look identical to the rest of the site.
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

let highlighterPromise: Promise<HighlighterCore> | undefined;

function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= (async () => {
    const [githubLight, githubDark, typescript] = await Promise.all([
      import("shiki/themes/github-light.mjs"),
      import("shiki/themes/github-dark.mjs"),
      import("shiki/langs/typescript.mjs"),
    ]);
    return createHighlighterCore({
      themes: [githubLight.default, githubDark.default],
      langs: [typescript.default],
      engine: createJavaScriptRegexEngine(),
    });
  })();
  return highlighterPromise;
}

/**
 * Renders `code` as TypeScript to an HTML string using VitePress's own light/dark theme pair.
 * The result carries the same `vp-code` class VitePress's own code blocks use, so it picks up
 * the site's existing `.vp-code span { color: var(--shiki-light|dark) }` rule for free.
 */
export async function highlightTs(code: string): Promise<string> {
  const highlighter = await getHighlighter();
  const html = highlighter.codeToHtml(code, {
    lang: "typescript",
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
  return html.replace('class="shiki', 'class="vp-code shiki');
}
