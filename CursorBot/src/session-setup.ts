import type { CursorBotMode } from "./cursor-mode.js";
import { formatModeLabel } from "./cursor-mode.js";
import type { MenuModelItem, ModelCatalog } from "./model-catalog.js";
import type { BotMessageButtonDto } from "./supra-bot-api.js";

export type SessionSetupStep = "mode" | "model";

export interface SessionSetupState {
  step: SessionSetupStep;
  questionMessageId?: string;
}

export const SETUP_CANCEL_ACTION = "/new cancel";

export function buildModeSetupMessage(): { text: string; buttons: BotMessageButtonDto[] } {
  return {
    text: "Новая сессия Cursor. Выберите режим или отмените:",
    buttons: [
      {
        id: "setup-mode-agent",
        text: "Agent (реализация)",
        action: "/mode agent",
        color: "primary",
      },
      {
        id: "setup-mode-ask",
        text: "Ask (вопросы без правок)",
        action: "/mode ask",
        color: "secondary",
      },
      {
        id: "setup-cancel",
        text: "Отмена",
        action: SETUP_CANCEL_ACTION,
        color: "default",
      },
    ],
  };
}

export function buildModelSetupMessage(
  modelItems: MenuModelItem[],
): { text: string; buttons: BotMessageButtonDto[] } {
  const buttons = modelItems.slice(0, 10).map((item, idx) => ({
    id: `setup-model-${idx}`,
    text: item.label,
    action: `/model ${item.key}`,
    color: item.key === "auto" ? "primary" : "default",
  }));
  buttons.push({
    id: "setup-model-cancel",
    text: "Отмена (текущая модель)",
    action: SETUP_CANCEL_ACTION,
    color: "default",
  });

  return {
    text: "Сессия сброшена. Выберите модель:",
    buttons,
  };
}

export function buildSetupCompleteMessage(
  mode: CursorBotMode,
  modelKey: string,
  catalog: ModelCatalog,
): string {
  return [
    "Готово. Контекст начинается заново.",
    `Режим: ${formatModeLabel(mode)}.`,
    `Модель: ${catalog.formatLabel(modelKey)}.`,
  ].join("\n");
}

export function isSetupModeResponse(text: string): boolean {
  return (
    text === "/mode agent" ||
    text.startsWith("/mode agent ") ||
    text === "/mode ask" ||
    text.startsWith("/mode ask ") ||
    text === "/mode plan" ||
    text.startsWith("/mode plan ")
  );
}

export function isSetupModelResponse(text: string): boolean {
  return text === "/model" || text.startsWith("/model ");
}

export function isSetupCancelResponse(text: string): boolean {
  return text === SETUP_CANCEL_ACTION || text.startsWith(`${SETUP_CANCEL_ACTION} `);
}

export function isSetupResponse(text: string, step: SessionSetupStep): boolean {
  if (isSetupCancelResponse(text)) return true;
  return step === "mode" ? isSetupModeResponse(text) : isSetupModelResponse(text);
}
