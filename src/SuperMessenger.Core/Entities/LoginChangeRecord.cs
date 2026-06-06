namespace SuperMessenger.Core.Entities;

/// <summary>Audit of login changes for reconnect delivery to offline contacts.</summary>
public sealed class LoginChangeRecord
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string OldLogin { get; set; } = "";
    public string NewLogin { get; set; } = "";
    public DateTime ChangedOn { get; set; } = DateTime.UtcNow;
}
