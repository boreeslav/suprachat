namespace SuperMessenger.Core.Entities;

public enum UserType
{
    User = 0,
    Admin = 1,
}

public sealed class UserRecord
{
    public Guid Id { get; set; }
    public string Login { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public UserType Type { get; set; } = UserType.User;
    public string? AvatarPath { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; } = true;
    public bool SearchableByLogin { get; set; } = true;
    public bool SearchableByName { get; set; }
    /// <summary>Short status (e.g. chat subtitle), max 20 characters.</summary>
    public string StatusText { get; set; } = "";
    /// <summary>Bio / «О себе», max 140 characters.</summary>
    public string AboutText { get; set; } = "";
    public string AllowInvite { get; set; } = "everyone";
    public string ShowOnlineStatus { get; set; } = "everyone";
    public string AllowWrite { get; set; } = "everyone";
    public DateTime? LastSeenAt { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;

    /// <summary>Base64 salt for PBKDF2 master encryption password.</summary>
    public string? EncryptionSalt { get; set; }
    /// <summary>Base64 AES-GCM blob verifying master password (client-generated).</summary>
    public string? EncryptionVerifier { get; set; }
    /// <summary>Base64 SPKI RSA-OAEP public key for distributing group auto passwords.</summary>
    public string? EncryptionPublicKey { get; set; }
    /// <summary>
    /// Base64 AES-GCM blob of PKCS#8 private key (same as client localStorage).
    /// Encrypted with master-derived key; server cannot decrypt without master password.
    /// </summary>
    public string? EncryptionPrivateKeyBlob { get; set; }

    /// <summary>When true, encryption uses the same password as account login (default for new users).</summary>
    public bool MasterPasswordMatchesLogin { get; set; } = true;

    /// <summary>Former logins kept for lookup redirects and reservation.</summary>
    public List<string> PreviousLogins { get; set; } = [];

    /// <summary>UTC time of the last self-service login change.</summary>
    public DateTime? LastLoginChangedAt { get; set; }
}
