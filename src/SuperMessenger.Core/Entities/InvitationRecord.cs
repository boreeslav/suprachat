namespace SuperMessenger.Core.Entities;

public sealed class InvitationRecord
{
    public Guid Id { get; set; }
    public string Token { get; set; } = "";
    public bool IsUsed { get; set; }
    public DateTime? UsedOn { get; set; }
    public Guid? CreatedUserId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresOn { get; set; }
    /// <summary>Personal invite link created by a regular user (not admin panel).</summary>
    public bool IsUserInvite { get; set; }
}
