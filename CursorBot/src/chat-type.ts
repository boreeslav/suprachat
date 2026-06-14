/** Группа, ветка или канал — не личный чат с ботом. */
export function isGroupChatType(chatType: string | undefined | null): boolean {
  const t = (chatType ?? "").trim().toLowerCase();
  return t !== "" && t !== "direct";
}
