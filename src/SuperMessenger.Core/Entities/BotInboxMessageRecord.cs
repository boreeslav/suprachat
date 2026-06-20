namespace SuperMessenger.Core.Entities;

/// <summary>Входящее сообщение бота для Bot API (хранится до 1 суток).</summary>
public sealed class BotInboxMessageRecord
{
    public Guid Id { get; set; }
    public Guid BotUserId { get; set; }
    public Guid ChatId { get; set; }
    public string ChatType { get; set; } = "";
    public string? ChatName { get; set; }
    public Guid MessageId { get; set; }
    public Guid SenderUserId { get; set; }
    public string SenderLogin { get; set; } = "";
    public string SenderName { get; set; } = "";
    public string Text { get; set; } = "";
    /// <summary>Сообщение из зашифрованной группы (пер-групповой переключатель включён).</summary>
    public bool EncryptionEnabled { get; set; }
    public Guid? ReplyToMessageId { get; set; }
    public string? ReplyToSenderName { get; set; }
    public string? ReplyToTextPreview { get; set; }
    public string? ButtonPressJson { get; set; }
    /// <summary>JSON BotAssistantSessionDto — вызов помощника из другого чата.</summary>
    public string? AssistantSessionJson { get; set; }
    /// <summary>JSON BotWebAppDataDto — данные из mini app.</summary>
    public string? WebAppDataJson { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
}
