import type { AgentModeOption } from "@cursor/sdk";

export type CursorBotMode = "agent" | "ask";

export function normalizeMode(mode: string | undefined): CursorBotMode {
  if (mode === "ask" || mode === "plan") return "ask";
  return "agent";
}

export function toSdkMode(mode: CursorBotMode): AgentModeOption {
  return mode as AgentModeOption;
}

export function formatModeLabel(mode: CursorBotMode): string {
  switch (mode) {
    case "ask":
      return "ask (вопросы без правок)";
    case "agent":
      return "agent (реализация)";
  }
}
