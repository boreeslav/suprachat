namespace SuperMessenger.Core.Entities;

/// <summary>Per-chat override меню помощника (direct-чат user↔bot).</summary>
public sealed class BotAssistantChatMenuRecord
{
    public Guid BotUserId { get; set; }
    public Guid ChatId { get; set; }
    public string MenuJson { get; set; } = "";
    public DateTime UpdatedOn { get; set; } = DateTime.UtcNow;
}
