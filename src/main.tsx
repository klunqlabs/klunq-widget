import { render } from "preact";
import App from "./App";
import { ModelConfig } from "./agent/agent";
import styles from "./styles.css?inline";

const highlightStyle = document.createElement("style");
highlightStyle.textContent = `.klunq-tool-highlight { outline: 3px solid #f59e0b !important; outline-offset: 2px; transition: outline 0.15s; }`;
document.head.appendChild(highlightStyle);

const container = document.createElement("div");
container.id = "klunq-widget-container";
document.body.appendChild(container);

const shadow = container.attachShadow({ mode: "closed" });

const styleEl = document.createElement("style");
styleEl.textContent = styles;
shadow.appendChild(styleEl);

const root = document.createElement("div");
root.id = "klunq-widget-root";
shadow.appendChild(root);

const applyTheme = (isDark: boolean) => root.classList.toggle("dark", isDark);
const media = window.matchMedia("(prefers-color-scheme: dark)");
applyTheme(media.matches);
media.addEventListener("change", (e) => applyTheme(e.matches));

let modelConfig: ModelConfig;

if (import.meta.env.DEV) {
  modelConfig = {
    model: "gemma4",
    apiKey: "ollama",
    baseURL: "http://localhost:11434/v1",
    scope: "page",
  };
} else {
  const scriptEl = document.currentScript as HTMLScriptElement | null;

  if (!scriptEl) {
    throw new Error("Widget must be loaded via <script...>");
  }

  if (!scriptEl.dataset.model || !scriptEl.dataset.baseUrl) {
    throw new Error("Missing mandatory attributes.");
  }

  const scope = scriptEl.dataset.scope === "broad" ? ("broad" as const) : ("page" as const);

  modelConfig = {
    model: scriptEl.dataset.model,
    apiKey: scriptEl.dataset.apiKey ?? "",
    baseURL: scriptEl.dataset.baseUrl,
    scope,
  };
}

render(<App modelConfig={modelConfig} />, root);
