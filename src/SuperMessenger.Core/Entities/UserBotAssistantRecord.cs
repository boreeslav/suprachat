namespace SuperMessenger.Core.Entities;

/// <summary>Бот, добавленный пользователем как помощник (пункт «Боты» в меню сообщений).</summary>
public sealed class UserBotAssistantRecord
{
    public Guid UserId { get; set; }
    public Guid BotUserId { get; set; }
    public DateTime AddedOn { get; set; } = DateTime.UtcNow;
}
