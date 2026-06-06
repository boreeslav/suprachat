namespace SuperMessenger.Core.Entities;

/// <summary>Автоматический пароль группы, зашифрованный публичным ключом участника (RSA-OAEP).</summary>
public sealed class SupraChatMemberKeyRecord
{
    public Guid Id { get; set; }
    public Guid ChatId { get; set; }
    public Guid UserId { get; set; }
    /// <summary>Base64 ciphertext: auto group password for this user.</summary>
    public string WrappedAutoPassword { get; set; } = "";
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
}
