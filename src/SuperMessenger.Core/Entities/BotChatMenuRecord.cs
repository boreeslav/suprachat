namespace SuperMessenger.Core.Entities;

public sealed class BotChatMenuRecord
{
    public Guid BotUserId { get; set; }
    public Guid ChatId { get; set; }
    public string MenuJson { get; set; } = "";
    public DateTime UpdatedOn { get; set; } = DateTime.UtcNow;
}
