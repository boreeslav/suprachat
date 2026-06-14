namespace SuperMessenger.Core.Entities;

public static class BotAssistantSessionStatus
{
    public const string Active = "active";
    public const string Replied = "replied";
    public const string Inserted = "inserted";
    public const string Dismissed = "dismissed";
    public const string Expired = "expired";
}

/// <summary>Сессия вызова помощника из пользовательского чата.</summary>
public sealed class BotAssistantSessionRecord
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid BotUserId { get; set; }
    public Guid SourceChatId { get; set; }
    public string? SourceChatName { get; set; }
    public string MenuItemId { get; set; } = "";
    public string Command { get; set; } = "";
    public string Status { get; set; } = BotAssistantSessionStatus.Active;
    public Guid? BotReplyMessageId { get; set; }
    public Guid? InsertedMessageId { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresOn { get; set; }
    public DateTime? RepliedOn { get; set; }
}
