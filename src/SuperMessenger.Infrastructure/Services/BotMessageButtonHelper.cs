using System.Text.Json;
using System.Text.Json.Serialization;
using SuperMessenger.Core.Dtos;

namespace SuperMessenger.Infrastructure.Services;

public static class BotMessageButtonHelper
{
    public const int MaxButtons = 10;
    public const int MaxTextLen = 64;
    public const int MaxActionLen = 4096;
    public const int MaxIdLen = 64;

    static readonly HashSet<string> AllowedColors = new(StringComparer.OrdinalIgnoreCase)
    {
        "default", "primary", "secondary", "danger", "success",
    };

    static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static List<BotMessageButtonDto> ParseButtons(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<BotMessageButtonDto>>(json, JsonOptions) ?? [];
        }
        catch
        {
            return [];
        }
    }

    public static BotMessageButtonPressDto? ParseButtonPress(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return null;

        try
        {
            return JsonSerializer.Deserialize<BotMessageButtonPressDto>(json, JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    public static string? SerializeButtons(IReadOnlyList<BotMessageButtonDto>? buttons)
    {
        if (buttons == null || buttons.Count == 0)
            return null;
        return JsonSerializer.Serialize(buttons, JsonOptions);
    }

    public static string SerializeButtonPress(BotMessageButtonPressDto press) =>
        JsonSerializer.Serialize(press, JsonOptions);

    public static (List<BotMessageButtonDto>? buttons, string? error) ValidateButtons(List<BotMessageButtonDto>? buttons)
    {
        if (buttons == null || buttons.Count == 0)
            return ([], null);

        if (buttons.Count > MaxButtons)
            return (null, $"Не более {MaxButtons} кнопок в сообщении");

        var result = new List<BotMessageButtonDto>(buttons.Count);
        var usedIds = new HashSet<string>(StringComparer.Ordinal);

        for (var i = 0; i < buttons.Count; i++)
        {
            var item = buttons[i];
            if (item == null)
                return (null, "Пустая кнопка");

            var text = (item.text ?? "").Trim();
            if (string.IsNullOrEmpty(text))
                return (null, "У каждой кнопки должен быть text");
            if (text.Length > MaxTextLen)
                return (null, $"text кнопки не длиннее {MaxTextLen} символов");

            var action = (item.action ?? "").Trim();
            if (string.IsNullOrEmpty(action))
                return (null, "У каждой кнопки должен быть action");
            if (action.Length > MaxActionLen)
                return (null, $"action не длиннее {MaxActionLen} символов");

            var id = (item.id ?? "").Trim();
            if (string.IsNullOrEmpty(id))
                id = i.ToString();
            if (id.Length > MaxIdLen)
                return (null, $"id кнопки не длиннее {MaxIdLen} символов");
            if (!usedIds.Add(id))
                return (null, $"Дублирующийся id кнопки: {id}");

            var color = NormalizeColor(item.color);
            result.Add(new BotMessageButtonDto
            {
                id = id,
                text = text,
                action = action,
                color = color,
            });
        }

        return (result, null);
    }

    public static string NormalizeColor(string? color)
    {
        var c = (color ?? "default").Trim();
        return AllowedColors.Contains(c) ? c.ToLowerInvariant() : "default";
    }

    public static BotMessageButtonDto? FindButton(IReadOnlyList<BotMessageButtonDto> buttons, string buttonId)
    {
        if (string.IsNullOrWhiteSpace(buttonId))
            return null;

        var id = buttonId.Trim();
        return buttons.FirstOrDefault(b => string.Equals(b.id, id, StringComparison.Ordinal))
            ?? (int.TryParse(id, out var idx) && idx >= 0 && idx < buttons.Count ? buttons[idx] : null);
    }
}
