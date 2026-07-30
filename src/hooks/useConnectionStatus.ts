import { useState, useEffect } from "preact/hooks";
import { pingModel, ModelConfig } from "../agent/agent";

export type ConnectionStatus = "checking" | "online" | "no_key" | "error";

export interface ConnectionInfo {
  status: ConnectionStatus;
  errorMessage: string;
  lastPingAt: number | null;
}

export function useConnectionStatus(config: ModelConfig): ConnectionInfo {
  const [info, setInfo] = useState<ConnectionInfo>({
    status: "checking",
    errorMessage: "",
    lastPingAt: null,
  });

  const { model, apiKey, baseURL } = config;

  useEffect(() => {
    let active = true;
    const thisConfig = { model, apiKey, baseURL };

    const check = async () => {
      if (!thisConfig.apiKey || thisConfig.apiKey.trim() === "") {
        if (active) {
          setInfo({
            status: "no_key",
            errorMessage: "",
            lastPingAt: Date.now(),
          });
        }
        return;
      }

      if (active) setInfo((prev) => ({ ...prev, status: "checking" }));
      const result = await pingModel(thisConfig);
      if (!active) return;
      if (result.ok) {
        setInfo({
          status: "online",
          errorMessage: "",
          lastPingAt: Date.now(),
        });
      } else {
        setInfo({
          status: "error",
          errorMessage: result.error || "Failed to reach the model API",
          lastPingAt: Date.now(),
        });
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [model, apiKey, baseURL]);

  return info;
}
