import { tool } from "langchain";
import { z } from "zod";

/* ── helpers ─────────────────────────────────────────── */

function highlight(el: Element | null): void {
  if (!el) return;
  el.classList.add("tool-highlight");
  setTimeout(() => el.classList.remove("tool-highlight"), 3000);
}

function logAction(msg: string): void {
  const log = document.getElementById("tool-log");
  if (!log) return;
  const entry = document.createElement("div");
  entry.className = "entry";
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

function findElement(input: string): Element | null {
  const bySelector = document.querySelector(input);
  if (bySelector) return bySelector;

  const lower = input.toLowerCase();
  const tags = ["button", "a", "input", "[tabindex]", "[onclick]", "select", "textarea"];
  const all = document.querySelectorAll(tags.join(","));
  for (const el of all) {
    const text = (el as HTMLElement).textContent?.trim().toLowerCase() || "";
    const value = (el as HTMLInputElement).value?.toLowerCase() || "";
    const id = el.id?.toLowerCase() || "";
    const placeholder = (el as HTMLInputElement).placeholder?.toLowerCase() || "";
    const ariaLabel = el.getAttribute("aria-label")?.toLowerCase() || "";
    if (
      text.includes(lower) ||
      value.includes(lower) ||
      id.includes(lower) ||
      placeholder.includes(lower) ||
      ariaLabel.includes(lower)
    ) {
      return el;
    }
  }
  return null;
}

function findLink(query: string): HTMLAnchorElement | null {
  const bySelector = document.querySelector(query);
  if (bySelector?.tagName === "A") return bySelector as HTMLAnchorElement;

  const lower = query.toLowerCase();
  const all = document.querySelectorAll("a");
  for (const a of all) {
    const text = a.textContent?.trim().toLowerCase() || "";
    const href = a.getAttribute("href")?.toLowerCase() || "";
    const id = a.id?.toLowerCase() || "";
    if (text.includes(lower) || href.includes(lower) || id.includes(lower)) {
      return a as HTMLAnchorElement;
    }
  }
  return null;
}

/* ── tools ───────────────────────────────────────────── */

export const browserTools = [
  tool(
    async () => {
      logAction("Source code read.");
      const body = document.body;
      if (!body) return "(no body element)";
      return body.innerHTML;
    },
    {
      name: "read_page_code",
      description: "Read the HTML source code inside <body>. Use when you need to inspect element structure, attributes, or hidden content.",
      schema: z.object({}).describe("No parameters needed"),
    },
  ),
  tool(
    async ({ selector }) => {
      const root = selector ? document.querySelector(selector) : document.body;
      if (!root) return `Element not found: ${selector}`;
      highlight(root);
      logAction(selector ? `Read content from "${selector}"` : "Read entire page content");
      return root.textContent?.trim() || "(no text found)";
    },
    {
      name: "read_page_content",
      description: "Read the visible text content of the page or a specific section. Leave the selector empty to read everything. Use this to understand what the page says before deciding what to interact with.",
      schema: z.object({
        selector: z.string().optional().describe("CSS selector for a specific section (e.g. '#content-section', 'article p'). Leave empty to read the whole page."),
      }),
    },
  ),
  tool(
    async ({ query }) => {
      const el = findElement(query);
      if (!el) return `Could not find a clickable element matching "${query}". Use read_page_code or read_page_content first to discover element names/IDs.`;
      const tag = el.tagName.toLowerCase();
      const text = (el as HTMLElement).textContent?.trim() || "";
      highlight(el);
      logAction(`Clicked "${tag}" matching "${query}"`);
      (el as HTMLElement).click();
      return `Clicked <${tag}>${text ? ` "${text.slice(0, 120)}"` : ""}.`;
    },
    {
      name: "click_element",
      description: "Click a button, link, or other interactive element on the page. Provide the element's visible text (e.g. 'Show alert'), element ID (e.g. 'btn-alert'), or a CSS selector. Use read_page_content or read_page_code first to discover what elements exist.",
      schema: z.object({
        query: z.string().describe("Visible text, element ID, or CSS selector of the element to click. Examples: 'Show alert', '#btn-alert', 'button.primary'."),
      }),
    },
  ),
  tool(
    async ({ query }) => {
      const a = findLink(query);
      if (!a) return `Could not find a link matching "${query}". Use read_page_content to discover link text.`;
      const href = a.getAttribute("href");
      if (!href) return `The link "${query}" has no href attribute.`;
      highlight(a);
      logAction(`Followed link matching "${query}" → ${href}`);
      window.location.href = href;
      return `Navigated to: ${href}`;
    },
    {
      name: "follow_link",
      description: "Navigate to a link's URL. Provide the link's visible text (e.g. 'LangChain documentation'), element ID, or CSS selector. Use read_page_content first to see what links are available on the page.",
      schema: z.object({
        query: z.string().describe("Visible link text, element ID, or CSS selector of the link to follow. Examples: 'LangChain documentation', '#link-langchain', 'a:first-of-type'."),
      }),
    },
  ),
];
