# AGENTS.md

## Project structure

```
widget/             Client-side chat widget (Vite + Preact + TypeScript + Tailwind v4 + LangChain)
  src/
    agent/          Agent setup (agent.ts, tools.ts)
    components/     Preact components (ChatInterface.tsx, FloatingButton.tsx)
    hooks/          Custom hooks (useChat.ts)
    App.tsx         Root component, context providers
    main.tsx        Entry point — shadow DOM, dark mode detection, model config
    styles.css      Tailwind v4 @theme + all component CSS
proxy/              Server proxy (future — empty, only .gitkeep)
```

## Widget commands (`widget/`)

| Command | Action |
|---------|--------|
| `npm run dev` | Start Vite dev server (serves `index.html` dev sandbox) |
| `npm run build` | `tsc && vite build` — produces `dist/clank-widget.js` (IIFE) + `dist/clank-widget.css` |
| `npm run preview` | Preview production build locally |

## Embedding the widget (production)

```html
<link rel="stylesheet" href="clank-widget.css" />
<script src="clank-widget.js" data-model="<model>" data-api-key="<key>" data-base-url="<url>"></script>
```

The `<script>` tag requires `data-model`, `data-api-key`, and `data-base-url` attributes. Example:

```html
<script src="clank-widget.js" data-model="gemma4" data-api-key="ollama" data-base-url="http://localhost:11434/v1"></script>
```

The widget auto-injects a floating chat button into `document.body`.

In **development** (`index.html`), model config defaults to Ollama (`gemma4`, `localhost:11434`).

## Architecture notes

- Two-package layout: client widget + server proxy (proxy not yet implemented).
- Widget entry (`src/main.tsx`) creates `#clank-widget-container`, attaches a **closed shadow DOM**, and renders Preact into `#clank-widget-root` inside it.
- Dark mode: detected via `matchMedia("(prefers-color-scheme: dark)")` and toggles `.dark` class on `#clank-widget-root`. Both `@media (prefers-color-scheme: dark)` and `#clank-widget-root.dark` selectors override CSS custom properties.
- Built as IIFE via Vite library mode — all dependencies bundled into one JS file.
- CSS is imported inline via `?inline` in dev (injected into shadow DOM as `<style>`); for production builds it extracts to `dist/clank-widget.css` via Vite's `assetFileNames`.
- **LangChain is fully wired** to an LLM via `@langchain/openai`. The agent (`src/agent/agent.ts`) connects to any OpenAI-compatible API (defaults to local Ollama). Browser automation tools are registered: `read_page_code`, `read_page_content`, `click_element`, `follow_link`, `set_field_value`.
- Markdown rendering uses **snarkdown** (~1KB) instead of `marked`.
- Dark theme switches cyan (`#4CC1BC`) to neon purple (`#8A2BE2`), glass background to dark oil-fluid.
- Future: multi-provider LLM support, Chrome built-in Gemini Nano.
- Widget is designed to be embedded on any existing web page with no side effects.

## What not to do

- Do not convert to SPA or framework router — this is an embeddable widget.
- Do not add CSS-in-JS or runtime style injection — keep CSS as a separate extracted file for now.
- Do not remove `index.html` — it's the dev sandbox, not production output.

## Frameworks and conventions

- **Preact** via `@preact/preset-vite` (JSX, `preact/hooks`)
- TSX/JSX uses `class` not `className` (Preact convention)
- **Tailwind CSS v4** via `@tailwindcss/vite`; all theme tokens in `@theme` block in `styles.css`; no tailwind.config — uses native CSS custom properties for theming
- **Types** are defined inline near usage (`agent/agent.ts`, `App.tsx`, `ChatInterface.tsx`) — no `src/types/` directory
- Components in `src/components/`, hooks in `src/hooks/`, agent in `src/agent/`
- All hardcoded colors replaced with `var(--color-*)` — light defaults in `@theme`, dark overrides via `@media`/`.dark` blocks
