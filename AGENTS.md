# AGENTS.md

## Project structure

```
src/
  agent/          Agent setup (agent.ts, tools.ts)
  components/     Preact components (ChatInterface.tsx, FloatingButton.tsx)
  hooks/          Custom hooks (useChat.ts)
  App.tsx         Root component, context providers
  main.tsx        Entry point — shadow DOM, dark mode detection, model config
  styles.css      Tailwind v4 @theme + all component CSS
index.html        Dev sandbox (not production output)
dist/             Production build output (klunq-widget.js)
```

## Commands

| Command         | Action                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| `npm run dev`   | Start Vite dev server (serves `index.html` dev sandbox)                   |
| `npm run build` | `tsc && vite build` — produces `dist/klunq-widget.js` (IIFE, CSS inlined) |

## Embedding the widget (production)

The widget is published to **npm** and served via **jsDelivr** (auto gzip/brotli). Pin to a release tag for production:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@klunqlabs/klunq-widget@<version>/dist/klunq-widget.js"
  data-model="<model>"
  data-api-key="<key>"
  data-base-url="<url>"
></script>
```

The `<script>` tag requires `data-model`, `data-api-key`, and `data-base-url` attributes. An optional `data-scope` attribute is also supported.

| Attribute       | Required | Default  | Description                                                                                 |
| --------------- | -------- | -------- | ------------------------------------------------------------------------------------------- |
| `data-model`    | yes      | —        | Model name                                                                                  |
| `data-api-key`  | yes      | —        | API key                                                                                     |
| `data-base-url` | yes      | —        | API base URL                                                                                |
| `data-scope`    | no       | `"page"` | `"page"` — agent denies off-topic questions; `"broad"` — agent may answer general questions |

Examples:

```html
<!-- Strict mode (default): agent only answers page-related questions -->
<script
  src="https://cdn.jsdelivr.net/npm/@klunqlabs/klunq-widget@1.0.0/dist/klunq-widget.js"
  data-model="gemma4"
  data-api-key="ollama"
  data-base-url="http://localhost:11434/v1"
></script>

<!-- Broad mode: agent may also answer general questions -->
<script
  src="https://cdn.jsdelivr.net/npm/@klunqlabs/klunq-widget@1.0.0/dist/klunq-widget.js"
  data-model="gemma4"
  data-api-key="ollama"
  data-base-url="http://localhost:11434/v1"
  data-scope="broad"
></script>
```

The widget auto-injects a floating chat button into `document.body`.

In **development** (`index.html`), model config defaults to Ollama (`gemma4`, `localhost:11434`).

## Architecture notes

- Single-package layout: client widget only (server proxy moved to separate repo).
- Widget entry (`src/main.tsx`) creates `#klunq-widget-container`, attaches a **closed shadow DOM**, and renders Preact into `#klunq-widget-root` inside it.
- Dark mode: detected via `matchMedia("(prefers-color-scheme: dark)")` and toggles `.dark` class on `#klunq-widget-root`. Both `@media (prefers-color-scheme: dark)` and `#klunq-widget-root.dark` selectors override CSS custom properties.
- Built as IIFE via Vite library mode — all dependencies bundled into one JS file.
- CSS is imported inline via `?inline` (injected into shadow DOM as `<style>`), so no separate CSS file is emitted.
- **LangChain is fully wired** to an LLM via `@langchain/openai`. The agent (`src/agent/agent.ts`) connects to any OpenAI-compatible API (defaults to local Ollama). Browser automation tools are registered: `read_page_code`, `read_page_content`, `click_element`, `follow_link`, `set_field_value`.
- **Scope restriction**: By default (`data-scope="page"`), the system prompt contains an ALL-CAPS clause instructing the agent to deny off-topic questions. Setting `data-scope="broad"` replaces this with a permissive note. The scope is baked into the system prompt at initialization time.
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
