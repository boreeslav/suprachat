/** Группа, ветка или канал — не личный чат с ботом. */
export function isGroupChatType(chatType: string | undefined | null): boolean {
  const t = (chatType ?? "").trim().toLowerCase();
  return t !== "" && t !== "direct";
}

/**
 * Чаты, где уместно публиковать «живое» сообщение мыслей агента
 * (создаётся, обновляется и удаляется по ходу работы).
 * Разрешено в личных чатах, группах и ветках; запрещено в каналах-вещаниях
 * и служебных mini app апдейтах, где это неуместно.
 */
export function supportsLiveThoughts(chatType: string | undefined | null): boolean {
  const t = (chatType ?? "").trim().toLowerCase();
  return t !== "channel" && t !== "mini_app";
}
