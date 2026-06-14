using System.Text.Json;
using System.Text.Json.Serialization;
using SuperMessenger.Core.Dtos;

namespace SuperMessenger.Infrastructure.Services;

public static class BotMenuHelper
{
    const int MaxItemsPerLevel = 30;
    const int MaxDepth = 3;
    const int MaxTextLen = 64;
    const int MaxMessageLen = 4096;
    const int MaxIdLen = 64;

    static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static BotApiMenuDto ParseMenu(string? menuJson)
    {
        if (string.IsNullOrWhiteSpace(menuJson))
            return new BotApiMenuDto();

        try
        {
            var menu = JsonSerializer.Deserialize<BotApiMenuDto>(menuJson, JsonOptions);
            return menu ?? new BotApiMenuDto();
        }
        catch
        {
            return new BotApiMenuDto();
        }
    }

    public static string SerializeMenu(BotApiMenuDto menu) =>
        JsonSerializer.Serialize(menu ?? new BotApiMenuDto(), JsonOptions);

    public static (BotApiMenuDto? menu, string? error) ValidateMenu(BotApiMenuDto? menu)
    {
        if (menu == null)
            return (new BotApiMenuDto(), null);

        var items = menu.items ?? [];
        var (normalized, error) = ValidateItems(items, 1);
        if (error != null)
            return (null, error);

        return (new BotApiMenuDto { items = normalized }, null);
    }

    static (List<BotApiMenuItemDto> items, string? error) ValidateItems(List<BotApiMenuItemDto> items, int depth)
    {
        if (depth > MaxDepth)
            return ([], "Превышена максимальная вложенность меню");

        if (items.Count > MaxItemsPerLevel)
            return ([], $"Не более {MaxItemsPerLevel} пунктов меню на уровень");

        var result = new List<BotApiMenuItemDto>(items.Count);
        foreach (var item in items)
        {
            if (item == null)
                return ([], "Пустой пункт меню");

            var text = (item.text ?? "").Trim();
            if (string.IsNullOrEmpty(text))
                return ([], "У каждого пункта меню должен быть text");
            if (text.Length > MaxTextLen)
                return ([], $"text не длиннее {MaxTextLen} символов");

            var id = (item.id ?? "").Trim();
            if (id.Length > MaxIdLen)
                return ([], $"id не длиннее {MaxIdLen} символов");

            var submenu = item.submenu ?? [];
            var message = (item.message ?? "").Trim();

            if (submenu.Count > 0)
            {
                if (!string.IsNullOrEmpty(message))
                    return ([], "Пункт с submenu не должен содержать message");

                var (nested, nestedError) = ValidateItems(submenu, depth + 1);
                if (nestedError != null)
                    return ([], nestedError);

                result.Add(new BotApiMenuItemDto
                {
                    id = string.IsNullOrEmpty(id) ? null : id,
                    text = text,
                    submenu = nested,
                });
                continue;
            }

            if (string.IsNullOrEmpty(message))
                return ([], "Листовой пункт меню должен содержать message");

            if (message.Length > MaxMessageLen)
                return ([], $"message не длиннее {MaxMessageLen} символов");

            result.Add(new BotApiMenuItemDto
            {
                id = string.IsNullOrEmpty(id) ? null : id,
                text = text,
                message = message,
            });
        }

        return (result, null);
    }

    public static BotApiMenuItemDto? FindLeafItemById(BotApiMenuDto menu, string itemId)
    {
        if (string.IsNullOrWhiteSpace(itemId)) return null;
        return FindLeafItemById(menu.items ?? [], itemId.Trim());
    }

    static BotApiMenuItemDto? FindLeafItemById(List<BotApiMenuItemDto> items, string itemId)
    {
        foreach (var item in items)
        {
            if (item.submenu is { Count: > 0 })
            {
                var nested = FindLeafItemById(item.submenu, itemId);
                if (nested != null) return nested;
                continue;
            }
            if (string.Equals(item.id, itemId, StringComparison.Ordinal))
                return item;
        }
        return null;
    }
}
