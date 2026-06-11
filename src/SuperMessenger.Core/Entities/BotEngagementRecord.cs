namespace SuperMessenger.Core.Entities;

public sealed class BotEngagementRecord
{
    public Guid UserId { get; set; }
    public Guid BotUserId { get; set; }
    public DateTime StartedOn { get; set; } = DateTime.UtcNow;
}
