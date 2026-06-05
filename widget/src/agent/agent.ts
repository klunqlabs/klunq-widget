import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";

const model = new ChatOpenAI({
  model: "gemma4",
  apiKey: "ollama",
  configuration: {
    baseURL: "http://localhost:11434/v1"
  }
})

export const agent = createAgent({
  model: model
})
