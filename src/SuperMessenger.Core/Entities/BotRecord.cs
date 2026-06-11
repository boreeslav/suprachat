namespace SuperMessenger.Core.Entities;

public sealed class BotRecord
{
    public Guid Id { get; set; }
    public Guid BotUserId { get; set; }
    public Guid OwnerUserId { get; set; }
    public string Slug { get; set; } = "";
    public string Description { get; set; } = "";
    /// <summary>SHA-256 hex текущего API-токена (plaintext показывается только при генерации).</summary>
    public string? TokenHash { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedOn { get; set; }
}
