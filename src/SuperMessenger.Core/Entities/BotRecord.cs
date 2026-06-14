namespace SuperMessenger.Core.Entities;

public sealed class BotRecord
{
    public Guid Id { get; set; }
    public Guid BotUserId { get; set; }
    public Guid OwnerUserId { get; set; }
    public string Slug { get; set; } = "";
    public string Description { get; set; } = "";
    /// <summary>JSON меню бота для UI (BotApiMenuDto).</summary>
    public string MenuJson { get; set; } = "";
    /// <summary>JSON меню помощника (BotApiMenuDto) — пункты в меню «Боты» у сообщений.</summary>
    public string AssistantMenuJson { get; set; } = "";
    /// <summary>JSON меню группы (BotApiMenuDto) — кнопка в composer группы/ветки, если бот — админ.</summary>
    public string GroupMenuJson { get; set; } = "";
    /// <summary>SHA-256 hex текущего API-токена (plaintext показывается только при генерации).</summary>
    public string? TokenHash { get; set; }
    public DateTime CreatedOn { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedOn { get; set; }
}
