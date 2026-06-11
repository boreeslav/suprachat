using System.Text.Json;
using System.Text.RegularExpressions;

namespace SuperMessenger.Infrastructure.Services;

public static partial class MessageAttachmentParser
{
    public const string McContentTag = "mc-content";

    [GeneratedRegex(
        $@"<{McContentTag}[^>]*type=""([^""]+)""[^>]*>([\s\S]*?)</{McContentTag}>",
        RegexOptions.Compiled | RegexOptions.CultureInvariant)]
    private static partial Regex McContentRegex();

    public static IReadOnlyList<Guid> ExtractFileIds(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return [];

        var match = McContentRegex().Match(text);
        if (!match.Success) return [];

        var contentType = match.Groups[1].Value;
        try
        {
            using var doc = JsonDocument.Parse(match.Groups[2].Value);
            var root = doc.RootElement;
            return contentType switch
            {
                "image" or "file" => TryReadSingleFileId(root, out var single) ? [single] : [],
                "photo_album" => ReadFileIdArray(root, "fileIds"),
                _ => [],
            };
        }
        catch (JsonException)
        {
            return [];
        }
    }

    static bool TryReadSingleFileId(JsonElement root, out Guid fileId)
    {
        fileId = default;
        if (!root.TryGetProperty("fileId", out var prop)) return false;
        return Guid.TryParse(prop.GetString(), out fileId);
    }

    static List<Guid> ReadFileIdArray(JsonElement root, string propertyName)
    {
        var result = new List<Guid>();
        if (!root.TryGetProperty(propertyName, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return result;

        foreach (var el in arr.EnumerateArray())
        {
            if (Guid.TryParse(el.GetString(), out var id))
                result.Add(id);
        }
        return result;
    }
}
