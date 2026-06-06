namespace SuperMessenger.Core.Entities;

public sealed class SupraUserBlockRecord
{
    public Guid BlockerUserId { get; set; }
    public Guid BlockedUserId { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
}
