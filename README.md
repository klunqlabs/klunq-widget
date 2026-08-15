# Klunq Widget

An embeddable AI chat widget built with **Preact**, **Tailwind CSS v4**, **LangChain**, and **TypeScript**. Designed to be dropped into any existing web page with zero side effects.

## Features

- **Embeddable widget** — Single IIFE bundle (`klunq-widget.js`), CSS inlined into Shadow DOM
- **AI Agent** — LangChain-powered agent with browser automation tools (read, click, type, navigate)
- **Shadow DOM isolation** — No style leakage, no conflicts with host page
- **Dark mode** — Auto-detects `prefers-color-scheme`, themeable via CSS custom properties
- **OpenAI-compatible** — Works with Ollama, OpenAI, and any OpenAI-compatible API
- **Lightweight** — ~250KB gzipped (Preact + LangChain + tools)
- **Connection monitoring** — Auto-detects API reachability with colored status indicator

## Security Disclaimer

> **Your API key is exposed**

The embed script sends the API key to the client, where it is visible to anyone and publicly available. Prefer free or capped [OpenRouter](https://openrouter.ai) keys that are rotated regularly, or route requests through your own [LiteLLM](https://www.litellm.ai/) proxy.

We are building **klunq-proxy** to fix this with disposable virtual keys and request inspection that cancels suspicious calls — work in progress, not available yet.

## Quick Start

### Embedding

The widget is published to **npm** and served via **jsDelivr**, which automatically gzips/brotli-compresses it. Add it to any page:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@klunqlabs/klunq-widget@1.0.0/dist/klunq-widget.js"
  data-model="gemma4"
  data-api-key="ollama"
  data-base-url="http://localhost:11434/v1"
></script>
```

Use `@<version>` to pin to a release (recommended for production). During development, a relative `src="klunq-widget.js"` pointing at `dist/` also works.

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

**Required attributes:**

- `data-model` — Model name (e.g., `gemma4`, `gpt-4o`)
- `data-api-key` — API key (or `ollama` for local)
- `data-base-url` — OpenAI-compatible base URL

**Optional attribute:**

- `data-scope` — `"page"` (default) agent only answers questions about the current page; `"broad"` agent may also answer general questions

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
│   │   ├── FloatingButton.tsx
│   │   └── StatusDot.tsx
│   ├── hooks/          # Custom hooks
│   │   ├── useChat.ts           # Agent invocation, message state
│   │   └── useConnectionStatus.ts # API health ping + connection state
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

| Command         | Description                   |
| --------------- | ----------------------------- |
| `npm run dev`   | Start Vite dev server         |
| `npm run build` | Type-check + production build |

## Architecture

- **Entry** (`main.tsx`) creates `#klunq-widget-container` with closed Shadow DOM, injects CSS, detects dark mode, reads model config from `<script data-*>` attributes (prod) or defaults (dev), renders Preact into `#klunq-widget-root`.
- **Agent** (`agent/agent.ts`) uses `@langchain/openai` with bound browser tools (`read_page_content`, `read_page_code`, `click_element`, `follow_link`, `set_field_value`). Runs a 25-step ReAct loop.
- **Tools** (`agent/tools.ts`) execute in host page context via `window` — can read/click/type/navigate any element.
- **Styling** — Tailwind v4 via `@tailwindcss/vite`. All colors use CSS custom properties (`--color-*`) defined in `@theme`. Dark overrides via `@media (prefers-color-scheme: dark)` and `.dark` class on shadow root.
- **Connection monitoring** — On mount, the widget sends a "Ping" system message to the API via `pingModel()`. Pings repeat every 30s. A colored dot next to the Klunq logo reflects the current state: green (online), orange (no API key), red (error), amber (checking). Hovering the dot shows a tooltip with details. When the API is unreachable or no key is provided, all send controls are disabled.

## Configuration

### Model Config (Production)

Pass via `<script>` attributes:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@klunqlabs/klunq-widget@1.0.0/dist/klunq-widget.js"
  data-model="gpt-4o"
  data-api-key="sk-..."
  data-base-url="https://api.openai.com/v1"
  data-scope="broad"
></script>
```

| Attribute       | Required | Default  | Description                                                                                 |
| --------------- | -------- | -------- | ------------------------------------------------------------------------------------------- |
| `data-model`    | yes      | —        | Model name                                                                                  |
| `data-api-key`  | yes      | —        | API key                                                                                     |
| `data-base-url` | yes      | —        | API base URL                                                                                |
| `data-scope`    | no       | `"page"` | `"page"` — agent denies off-topic questions; `"broad"` — agent may answer general questions |

### Model Config (Development)

Defaults in `main.tsx`:

```ts
model: "gemma4";
apiKey: "ollama";
baseURL: "http://localhost:11434/v1";
scope: "page"; // hardcoded, data-* attributes not read in dev
```

### Connection Status

The widget monitors API reachability via periodic pings and displays the result as a colored dot next to the Klunq logo.

| Status     | Dot Color | Tooltip                                  | Sending Enabled     |
| ---------- | --------- | ---------------------------------------- | ------------------- |
| `checking` | Amber     | "Reaching provider..."                   | No (until resolved) |
| `online`   | Green     | "Online"                                 | Yes                 |
| `no_key`   | Orange    | "No API key. Try logging in to get one." | No                  |
| `error`    | Red       | HTTP status + error message              | No                  |

The first ping runs on mount. Subsequent pings run every 30 seconds. On `error`, the tooltip displays the actual error (e.g. `401 Unauthorized`, `429 Too Many Requests`, `503 Service Unavailable`). Pings use a 20-second timeout and `maxTokens: 5` to minimize cost.

## Browser Tools

The agent has access to:

| Tool                | Description                            |
| ------------------- | -------------------------------------- |
| `read_page_content` | Extract visible text from page         |
| `read_page_code`    | Get outerHTML of element (by selector) |
| `click_element`     | Click any clickable element            |
| `follow_link`       | Navigate to a link URL                 |
| `set_field_value`   | Type into input/textarea/select        |

Tools highlight target elements with `.klunq-tool-highlight` (amber outline).

## Requirements

- Node.js 20+
- OpenAI-compatible API endpoint (Ollama, OpenAI, etc.)

## License

[MIT](LICENSE) — If you use this software in a project, please include a link back to this repository.
