namespace SuperMessenger.Core.Entities;

/// <summary>Per-group override меню бота для групп и веток.</summary>
public sealed class BotGroupChatMenuRecord
{
    public Guid BotUserId { get; set; }
    public Guid ChatId { get; set; }
    public string MenuJson { get; set; } = "";
    public DateTime UpdatedOn { get; set; } = DateTime.UtcNow;
}
