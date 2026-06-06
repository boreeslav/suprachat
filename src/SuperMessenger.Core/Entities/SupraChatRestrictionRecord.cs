namespace SuperMessenger.Core.Entities;

public static class ChatRestrictionKinds
{
    public const string Excluded = "excluded";
    public const string Blocked = "blocked";
}

public sealed class SupraChatRestrictionRecord
{
    public Guid ChatId { get; set; }
    public Guid UserId { get; set; }
    public string Kind { get; set; } = "";
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
}
