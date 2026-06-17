import type { BotActionDefinition } from "./actions-config.js";
import { ACTION_CMD_PREFIX, META_MANAGE, META_PAGE } from "./actions-constants.js";
import type { BotMessageButtonDto } from "./supra-bot-api.js";

export const MAX_ACTION_BUTTONS = 10;
export const MGMT_CATALOG_BUTTON_COUNT = 1;

export interface ActionCatalogPage {
  pageIndex: number;
  buttons: BotMessageButtonDto[];
}

const MGMT_BUTTON: BotMessageButtonDto = {
  id: "act-mgmt-manage",
  text: "⚙️ Управление",
  action: `${ACTION_CMD_PREFIX}${META_MANAGE}`,
  color: "secondary",
};

function buildCatalogPages(
  actions: BotActionDefinition[],
  reservedBottom: number,
  mapUserButton: (action: BotActionDefinition, pageIndex: number, indexOnPage: number) => BotMessageButtonDto,
  pageActionPrefix = META_PAGE,
): ActionCatalogPage[] {
  if (!actions.length) {
    return [{ pageIndex: 0, buttons: reservedBottom > 0 ? [MGMT_BUTTON] : [] }];
  }

  const pages: ActionCatalogPage[] = [];
  let offset = 0;
  let pageIndex = 0;

  while (offset < actions.length) {
    const hasPrev = pageIndex > 0;
    const remaining = actions.length - offset;
    let navCount = hasPrev ? 1 : 0;
    let userSlots = MAX_ACTION_BUTTONS - reservedBottom - navCount;
    const needsNext = remaining > userSlots;
    if (needsNext) {
      navCount++;
      userSlots = MAX_ACTION_BUTTONS - reservedBottom - navCount;
    }

    const count = Math.min(remaining, userSlots);
    const pageActions = actions.slice(offset, offset + count);
    const buttons: BotMessageButtonDto[] = pageActions.map((action, index) =>
      mapUserButton(action, pageIndex, index),
    );

    if (hasPrev) {
      buttons.push({
        id: `act-page-prev-${pageIndex - 1}`,
        text: "◀ Назад",
        action: `${ACTION_CMD_PREFIX}${pageActionPrefix}:${pageIndex - 1}`,
        color: "default",
      });
    }
    if (needsNext) {
      buttons.push({
        id: `act-page-next-${pageIndex + 1}`,
        text: "Ещё ▶",
        action: `${ACTION_CMD_PREFIX}${pageActionPrefix}:${pageIndex + 1}`,
        color: "default",
      });
    }
    if (reservedBottom > 0) {
      buttons.push(MGMT_BUTTON);
    }

    pages.push({ pageIndex, buttons });
    offset += count;
    pageIndex++;
  }

  return pages;
}

export function buildActionCatalogPages(
  actions: BotActionDefinition[],
): ActionCatalogPage[] {
  return buildCatalogPages(actions, MGMT_CATALOG_BUTTON_COUNT, (action, pageIndex, indexOnPage) => ({
    id: `act-${action.id}`,
    text: action.title,
    action: `${ACTION_CMD_PREFIX}${action.id}`,
    color: pageIndex === 0 && indexOnPage === 0 ? "primary" : "default",
  }));
}

export function getActionCatalogPage(
  actions: BotActionDefinition[],
  pageIndex = 0,
): ActionCatalogPage {
  const pages = buildActionCatalogPages(actions);
  if (!pages.length) return { pageIndex: 0, buttons: [MGMT_BUTTON] };
  const idx = Math.max(0, Math.min(pageIndex, pages.length - 1));
  return pages[idx]!;
}

export function buildActionPickerPages(
  actions: BotActionDefinition[],
  actionPrefix: string,
  color: BotMessageButtonDto["color"] = "default",
): ActionCatalogPage[] {
  return buildCatalogPages(
    actions,
    0,
    (action) => ({
      id: `act-${actionPrefix}-${action.id}`,
      text: action.title,
      action: `${ACTION_CMD_PREFIX}${actionPrefix}:${action.id}`,
      color,
    }),
    `${actionPrefix}:page`,
  );
}

export function getActionPickerPage(
  actions: BotActionDefinition[],
  actionPrefix: string,
  pageIndex = 0,
  color: BotMessageButtonDto["color"] = "default",
): ActionCatalogPage {
  const pages = buildActionPickerPages(actions, actionPrefix, color);
  if (!pages.length) return { pageIndex: 0, buttons: [] };
  const idx = Math.max(0, Math.min(pageIndex, pages.length - 1));
  return pages[idx]!;
}
