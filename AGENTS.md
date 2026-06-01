# AGENTS.md

## Project structure

```
widget/     Client-side chat widget (Vite + Preact + TypeScript + LangChain)
proxy/      Server proxy (future — no code yet)
```

## Widget commands (`widget/`)

| Command | Action |
|---------|--------|
| `npm run dev` | Start Vite dev server (serves `index.html` dev sandbox) |
| `npm run build` | `tsc && vite build` — produces `dist/clank-widget.js` (IIFE) + `dist/clank-widget.css` |
| `npm run preview` | Preview production build locally |

## Embedding the widget

Include both build outputs on any page:

```html
<link rel="stylesheet" href="clank-widget.css" />
<script src="clank-widget.js"></script>
```

The widget auto-injects a floating chat button into `document.body`.

## Architecture notes

- Two-package layout: client widget + server proxy (proxy not yet implemented).
- Widget entry (`src/main.tsx`) creates `#clank-widget-container`, appends it to `<body>`, and renders Preact into it.
- Built as IIFE via Vite library mode — all dependencies bundled into one JS file.
- CSS is extracted as a separate file (not inlined), must be included alongside the JS.
- LangChain is declared as a dependency but not yet wired to any LLM. Integration is next step.
- Future: multi-provider LLM support, Chrome built-in Gemini Nano.
- Widget is designed to be embedded on any existing web page with no side effects.

## What not to do

- Do not convert to SPA or framework router — this is an embeddable widget.
- Do not add CSS-in-JS or runtime style injection — keep CSS as a separate extracted file for now.
- Do not remove `index.html` — it's the dev sandbox, not production output.

## Frameworks and conventions

- **Preact** via `@preact/preset-vite` (JSX, `preact/hooks`)
- TSX/JSX uses `class` not `className` (Preact convention)
- Types in `src/types/`
- Components in `src/components/`
