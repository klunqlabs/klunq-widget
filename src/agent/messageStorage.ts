import {
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

// Single shared key for the whole origin. Browser restart clears
// sessionStorage, which restarts the thread.
export const MESSAGES_STORAGE_KEY = "klunq:messages:v1";

// Swap `sessionStorage` for `localStorage` to persist across restarts.
function backend(): Storage | null {
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage;
    return null;
  } catch {
    return null;
  }
}

export function saveMessages(messages: BaseMessage[]): void {
  const store = backend();
  if (!store) return;
  try {
    store.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(mapChatMessagesToStoredMessages(messages)));
  } catch {
    // Private mode, quota, or unserializable content: stay in-memory.
  }
}

export function loadMessages(): BaseMessage[] | null {
  const store = backend();
  if (!store) return null;
  try {
    const raw = store.getItem(MESSAGES_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return mapStoredMessagesToChatMessages(parsed);
  } catch {
    // Corrupt or incompatible payload: start a new thread instead.
    return null;
  }
}
