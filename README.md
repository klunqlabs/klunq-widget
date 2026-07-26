# Klunq Widget

An embeddable AI chat widget built with **Preact**, **Tailwind CSS v4**, **LangChain**, and **TypeScript**. Designed to be dropped into any existing web page with zero side effects.

## Features

- **Embeddable widget** — Single IIFE bundle (`klunq-widget.js`), CSS inlined into Shadow DOM
- **AI Agent** — LangChain-powered agent with browser automation tools (read, click, type, navigate)
- **Shadow DOM isolation** — No style leakage, no conflicts with host page
- **Dark mode** — Auto-detects `prefers-color-scheme`, themeable via CSS custom properties
- **OpenAI-compatible** — Works with Ollama, OpenAI, and any OpenAI-compatible API
- **Lightweight** — ~250KB gzipped (Preact + LangChain + tools)

## Quick Start

### Development

```bash
npm install
npm run dev
```

Opens `http://localhost:5173` with the dev sandbox (`index.html`).

### Production Build

```bash
npm run build
```

Outputs `dist/klunq-widget.js` (IIFE, CSS inlined).

### Embedding

```html
<script
  src="klunq-widget.js"
  data-model="gemma4"
  data-api-key="ollama"
  data-base-url="http://localhost:11434/v1"
></script>
```

**Required attributes:**
- `data-model` — Model name (e.g., `gemma4`, `gpt-4o`)
- `data-api-key` — API key (or `ollama` for local)
- `data-base-url` — OpenAI-compatible base URL

The widget auto-injects a floating chat button into `document.body`.

## Project Structure

```
.
├── src/
│   ├── agent/          # LangChain agent + browser tools
│   │   ├── agent.ts    # Agent setup, system prompt, tool loop
│   │   └── tools.ts    # Browser automation tools (read, click, type, navigate)
│   ├── components/     # Preact components
│   │   ├── ChatInterface.tsx
│   │   └── FloatingButton.tsx
│   ├── hooks/          # Custom hooks
│   │   └── useChat.ts  # Agent invocation, message state
│   ├── App.tsx         # Root component, context providers
│   ├── main.tsx        # Entry: Shadow DOM, dark mode, model config
│   └── styles.css      # Tailwind v4 @theme + component styles
├── index.html          # Dev sandbox (not production output)
├── dist/               # Production build output
├── package.json
├── tsconfig.json
├── vite.config.ts
└── AGENTS.md           # Agent/developer instructions
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |

## Architecture

- **Entry** (`main.tsx`) creates `#klunq-widget-container` with closed Shadow DOM, injects CSS, detects dark mode, reads model config from `<script data-*>` attributes (prod) or defaults (dev), renders Preact into `#klunq-widget-root`.
- **Agent** (`agent/agent.ts`) uses `@langchain/openai` with bound browser tools (`read_page_content`, `read_page_code`, `click_element`, `follow_link`, `set_field_value`). Runs a 25-step ReAct loop.
- **Tools** (`agent/tools.ts`) execute in host page context via `window` — can read/click/type/navigate any element.
- **Styling** — Tailwind v4 via `@tailwindcss/vite`. All colors use CSS custom properties (`--color-*`) defined in `@theme`. Dark overrides via `@media (prefers-color-scheme: dark)` and `.dark` class on shadow root.

## Configuration

### Model Config (Production)

Pass via `<script>` attributes:

```html
<script
  src="klunq-widget.js"
  data-model="gpt-4o"
  data-api-key="sk-..."
  data-base-url="https://api.openai.com/v1"
></script>
```

### Model Config (Development)

Defaults in `main.tsx`:
```ts
model: "gemma4"
apiKey: "ollama"
baseURL: "http://localhost:11434/v1"
```

### Theming

Override CSS custom properties on the host page:

```css
#klunq-widget-root {
  --color-primary: #your-brand-color;
  --color-surface: #your-surface;
  --color-on-surface: #your-text;
}
```

Dark mode overrides in `@media (prefers-color-scheme: dark)` in `styles.css`.

## Browser Tools

The agent has access to:

| Tool | Description |
|------|-------------|
| `read_page_content` | Extract visible text from page |
| `read_page_code` | Get outerHTML of element (by selector) |
| `click_element` | Click any clickable element |
| `follow_link` | Navigate to a link URL |
| `set_field_value` | Type into input/textarea/select |

Tools highlight target elements with `.tool-highlight` (amber outline).

## Requirements

- Node.js 20+
- OpenAI-compatible API endpoint (Ollama, OpenAI, etc.)

## License

[MIT](LICENSE) — If you use this software in a project, please include a link back to this repository.