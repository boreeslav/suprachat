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
    /// <summary>Пер-групповой переключатель шифрования. По умолчанию false (старые группы — открытые).</summary>
    public bool EncryptionEnabled { get; set; }
    /// <summary>Уникальная ссылка канала (/@slug). Только для Type=channel.</summary>
    public string? Slug { get; set; }
    /// <summary>Описание канала.</summary>
    public string? Description { get; set; }
    /// <summary>Мягкое удаление канала (UTC). Только для Type=channel.</summary>
    public DateTime? DeletedOn { get; set; }
    /// <summary>Родительская группа для ветки (Type=group_branch).</summary>
    public Guid? ParentChatId { get; set; }
    /// <summary>Адрес ветки в URL: /@parentId/branchSlug. Только для Type=group_branch.</summary>
    public string? BranchSlug { get; set; }
    /// <summary>Порядок ветки внутри группы (Type=group_branch).</summary>
    public int BranchOrder { get; set; }
    /// <summary>Отображаемое имя основной ветки (пусто — клиентский default «Основная»).</summary>
    public string? MainBranchName { get; set; }
    /// <summary>Порядок основной ветки среди всех веток группы.</summary>
    public int MainBranchOrder { get; set; }
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
    /// <summary>
    /// Монотонный порядковый номер сообщения в рамках чата — канонический ключ сортировки.
    /// Назначается сервером один раз при создании и больше не меняется.
    /// </summary>
    public long Seq { get; set; }
    /// <summary>
    /// Монотонная версия изменения в рамках чата для дельта-синхронизации.
    /// Растёт при любом изменении сообщения (создание, редактирование, удаление для всех).
    /// </summary>
    public long Rev { get; set; }
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
    /// <summary>JSON-массив inline-кнопок бота (BotMessageButtonDto).</summary>
    public string? ButtonsJson { get; set; }
    /// <summary>JSON метаданных нажатия inline-кнопки (BotMessageButtonPressDto).</summary>
    public string? ButtonPressJson { get; set; }
    /// <summary>JSON BotAssistantReplyMetaDto — ответ помощника для вставки в исходный чат.</summary>
    public string? AssistantReplyJson { get; set; }
    /// <summary>Невидимое сообщение: доставляется получателю, но не рендерится пузырём и не влияет на превью/счётчики (для авто-запуска mini app без сервисной карточки).</summary>
    public bool Invisible { get; set; }
    /// <summary>Личное сообщение в групповом чате: доставляется/видно только этому пользователю (null — всем участникам).</summary>
    public Guid? TargetUserId { get; set; }
}

public sealed class SupraMessageUserDeletionRecord
{
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }
}

/// <summary>
/// Глобальный закреп сообщения в чате (виден всем участникам).
/// Создаётся пользователем с правом закреплять «для всех» (админ группы/ветки,
/// владелец канала, любой участник личного чата).
/// </summary>
public sealed class SupraPinnedMessageRecord
{
    public Guid Id { get; set; }
    public Guid ChatId { get; set; }
    public Guid MessageId { get; set; }
    public Guid PinnedByUserId { get; set; }
    public DateTime PinnedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Персональный слой закрепа: либо личный закреп сообщения только для себя
/// (State = "pinned"), либо скрытие глобального закрепа только у себя (State = "hidden").
/// На пару (ChatId, MessageId, UserId) допускается одна запись.
/// </summary>
public sealed class SupraPinnedMessageUserRecord
{
    public Guid Id { get; set; }
    public Guid ChatId { get; set; }
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }
    /// <summary>pinned — личный закреп; hidden — скрыт глобальный закреп.</summary>
    public string State { get; set; } = "pinned";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
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

/// <summary>Ссылка сообщения на прикреплённый файл (для доступа при пересылке и сборки осиротевших файлов).</summary>
public sealed class SupraMessageFileReferenceRecord
{
    public Guid MessageId { get; set; }
    public Guid ChatId { get; set; }
    public Guid FileId { get; set; }
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
    /// <summary>JPEG-превью для чата (сжатое, без EXIF).</summary>
    public string? PreviewPath { get; set; }
    /// <summary>JPEG среднего качества для просмотра (без EXIF).</summary>
    public string? MediumPath { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
}
