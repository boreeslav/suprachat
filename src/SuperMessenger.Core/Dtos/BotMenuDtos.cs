namespace SuperMessenger.Core.Dtos;

public sealed class BotApiMenuItemDto
{
    public string? id { get; set; }
    public string text { get; set; } = "";
    public string? message { get; set; }
    public List<BotApiMenuItemDto>? submenu { get; set; }
}

public sealed class BotApiMenuDto
{
    public List<BotApiMenuItemDto> items { get; set; } = [];
}

public sealed class BotApiGetMenuResponse
{
    public bool success { get; set; }
    public BotApiMenuDto? menu { get; set; }
    public string? chatId { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiSetMenuResponse
{
    public bool success { get; set; }
    public BotApiMenuDto? menu { get; set; }
    public string? chatId { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiGetGroupMenuResponse
{
    public bool success { get; set; }
    public BotApiMenuDto? groupMenu { get; set; }
    public string? chatId { get; set; }
    public string? error { get; set; }
}

public sealed class BotApiSetGroupMenuResponse
{
    public bool success { get; set; }
    public BotApiMenuDto? groupMenu { get; set; }
    public string? chatId { get; set; }
    public string? error { get; set; }
}
