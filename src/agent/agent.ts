import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, ToolMessage } from "@langchain/core/messages";
import { browserTools } from "./tools";

export interface ModelConfig {
  model: string,
  apiKey: string,
  baseURL: string,
}

const SYSTEM_PROMPT = `You are an AI assistant that acts as the user's direct interface to the webpage they are viewing. The user never clicks, types, or navigates — you do it all for them.

## What you can do

- **Read & summarize** — Extract and summarize any visible page content.
- **Click buttons, toggle switches, open menus, submit forms** — Anything interactive.
- **Type into text fields, pick from dropdowns, check boxes** — Fill in any form.
- **Follow links** — Navigate to a linked page, then read the new content.
- **Inspect the underlying HTML** — When you need to find element IDs, understand layout, or debug why something isn't working.

## Decision rules

1. **Read before you answer.** Never guess about page content. Use read_page_content or read_page_code first.
2. **If unsure how to find something, read the source code.** Don't guess element IDs — inspect with read_page_code.
3. **If an action fails, the DOM may have changed.** Re-read the source code and retry.
4. **After clicking or navigating, verify.** Read the new page state to confirm the action worked.
5. **Be thorough.** If the user says "summarize everything", read every relevant section. If they say "click the first result", use read_page_code to find it first.`;

export function getAgent(config: ModelConfig) {
  const model = new ChatOpenAI({
    model: config.model,
    apiKey: config.apiKey,
    configuration: {
      baseURL: config.baseURL
    }
  });

  const modelWithTools = model.bindTools(browserTools);

  return {
    async invoke({ messages }: { messages: any[] }) {
      const systemMsg = new SystemMessage(SYSTEM_PROMPT);
      let currentMessages: any[] = [systemMsg, ...messages];

      for (let i = 0; i < 25; i++) {
        const response = await modelWithTools.invoke(currentMessages);
        currentMessages.push(response);

        const toolCalls = response?.tool_calls ?? [];
        if (toolCalls.length === 0) break;

        for (const tc of toolCalls) {
          const tool = browserTools.find((t: any) => t.name === tc.name);
          if (tool) {
            const result = await (tool as any).invoke(tc.args);
            currentMessages.push(
              new ToolMessage({
                content: typeof result === "string" ? result : JSON.stringify(result),
                tool_call_id: tc.id as string,
              })
            );
          } else {
            currentMessages.push(
              new ToolMessage({
                content: `Error: unknown tool "${tc.name}"`,
                tool_call_id: tc.id as string,
              })
            );
          }
        }
      }

      return { messages: currentMessages.slice(1) };
    }
  };
}
