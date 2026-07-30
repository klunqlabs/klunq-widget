import { ConnectionStatus } from "../hooks/useConnectionStatus";

interface StatusDotProps {
  status: ConnectionStatus;
  errorMessage?: string;
}

const baseTooltips: Record<ConnectionStatus, string> = {
  checking: "Reaching provider...",
  online: "Online",
  no_key: "No API key. Try logging in to get one.",
  error: "",
};

const cssClass: Record<ConnectionStatus, string> = {
  checking: "klunq-status-checking",
  online: "klunq-status-online",
  no_key: "klunq-status-no-key",
  error: "klunq-status-error",
};

export default function StatusDot({ status, errorMessage }: StatusDotProps) {
  const tooltip = status === "error" && errorMessage ? errorMessage : baseTooltips[status];

  return (
    <div class="relative group/status">
      <div class={`w-2 h-2 rounded-full ${cssClass[status]}`} />
      <div class="klunq-tooltip">{tooltip}</div>
    </div>
  );
}
