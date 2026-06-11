namespace SuperMessenger.Core.Entities;

public sealed class SupraChatRecord
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "group";
    public Guid CreatorUserId { get; set; }
    public string? AvatarPath { get; set; }
    public bool AllowJoinByLink { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    /// <summary>Группа требует дополнительный пароль (задаётся вне сервера).</summary>
    public bool RequiresCustomGroupPassword { get; set; }
    /// <summary>Уникальная ссылка канала (/@slug). Только для Type=channel.</summary>
    public string? Slug { get; set; }
    /// <summary>Описание канала.</summary>
    public string? Description { get; set; }
}

public sealed class SupraChatParticipantRecord
{
    public Guid Id { get; set; }
    public Guid ChatId { get; set; }
    public Guid UserId { get; set; }
    public bool IsAdmin { get; set; }
    /// <summary>owner | admin | author | subscriber — для каналов; пусто для групп.</summary>
    public string Role { get; set; } = "";
}

public sealed class SupraChatMessageRecord
{
    public Guid Id { get; set; }
    public Guid ChatId { get; set; }
    public Guid SenderUserId { get; set; }
    public string SenderName { get; set; } = "";
    public string Text { get; set; } = "";
    public string Status { get; set; } = "sent";
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    public Guid? ReplyToMessageId { get; set; }
    public string? ReplyToSenderName { get; set; }
    public string? ReplyToTextPreview { get; set; }
    public string? ForwardedFromSenderName { get; set; }
    public DateTime? EditedOn { get; set; }
    public bool DeletedForEveryone { get; set; }
    /// <summary>basic — базовый ключ; protected — с доп. паролем чата.</summary>
    public string EncryptionTier { get; set; } = "basic";
    /// <summary>Клиентский id для идемпотентной отправки (local_*).</summary>
    public string? ClientLocalId { get; set; }
}

public sealed class SupraMessageUserDeletionRecord
{
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }
}

/// <summary>Фиксация прочтения сообщения конкретным пользователем (для групп и детальной статистики).</summary>
public sealed class SupraMessageReadReceiptRecord
{
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }
    public DateTime ReadAt { get; set; } = DateTime.UtcNow;
}

public sealed class SupraChatFolderRecord
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public string Icon { get; set; } = "";
    public int Order { get; set; }
    public bool IsArchive { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
}

public sealed class SupraChatFolderMemberRecord
{
    public Guid Id { get; set; }
    public Guid FolderId { get; set; }
    public Guid UserId { get; set; }
    public Guid ChatId { get; set; }
}

public sealed class SupraFileRecord
{
    public Guid Id { get; set; }
    public Guid ChatId { get; set; }
    public Guid UploadedByUserId { get; set; }
    public string FileName { get; set; } = "";
    public string MimeType { get; set; } = "";
    public long Size { get; set; }
    public string StoragePath { get; set; } = "";
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
}
