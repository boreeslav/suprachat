namespace SuperMessenger.Core.Entities;

/// <summary>Персональное меню бота в группе/ветке для конкретного участника.</summary>
public sealed class BotGroupChatUserMenuRecord
{
    public Guid BotUserId { get; set; }
    public Guid ChatId { get; set; }
    public Guid ViewerUserId { get; set; }
    public string MenuJson { get; set; } = "";
    public DateTime UpdatedOn { get; set; } = DateTime.UtcNow;
}
