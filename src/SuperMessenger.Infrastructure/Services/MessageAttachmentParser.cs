using System.Text.Json;
using System.Text.RegularExpressions;
using SuperMessenger.Core.Dtos;

namespace SuperMessenger.Infrastructure.Services;

public static partial class MessageAttachmentParser
{
    public const string McContentTag = "mc-content";
    public const int MaxPhotoAlbumSize = 6;

    public const string ContentTypeImage = "image";
    public const string ContentTypeFile = "file";
    public const string ContentTypePhotoAlbum = "photo_album";
    public const string ContentTypeMiniApp = "mini_app";

    [GeneratedRegex(
        $@"<{McContentTag}[^>]*type=""([^""]+)""[^>]*>([\s\S]*?)</{McContentTag}>",
        RegexOptions.Compiled | RegexOptions.CultureInvariant)]
    private static partial Regex McContentRegex();

    public static IReadOnlyList<Guid> ExtractFileIds(string? text)
    {
        var parsed = TryParse(text);
        return parsed?.FileIds ?? [];
    }

    public static ParsedMcContent? TryParse(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;

        var match = McContentRegex().Match(text);
        if (!match.Success) return null;

        var contentType = match.Groups[1].Value;
        try
        {
            using var doc = JsonDocument.Parse(match.Groups[2].Value);
            var root = doc.RootElement.Clone();
            var fileIds = contentType switch
            {
                ContentTypeImage or ContentTypeFile => TryReadSingleFileId(root, out var single) ? new List<Guid> { single } : [],
                ContentTypePhotoAlbum => ReadFileIdArray(root, "fileIds"),
                ContentTypeMiniApp => ReadMiniAppFileIds(root),
                _ => [],
            };
            return new ParsedMcContent(contentType, root, fileIds);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public static string Pack(string contentType, object payload) =>
        $"<{McContentTag} type=\"{contentType}\">{JsonSerializer.Serialize(payload)}</{McContentTag}>";

    public static BotApiMediaInfoDto? ToMediaInfo(string? text)
    {
        var parsed = TryParse(text);
        if (parsed == null) return null;

        var attachments = new List<BotApiFileAttachmentDto>();
        string? caption = null;

        switch (parsed.ContentType)
        {
            case ContentTypeImage:
            case ContentTypeFile:
                if (TryReadSingleAttachment(parsed.Payload, out var single))
                    attachments.Add(single);
                break;
            case ContentTypePhotoAlbum:
                caption = ReadString(parsed.Payload, "caption");
                attachments.AddRange(ReadAttachmentArray(parsed.Payload));
                break;
        }

        if (attachments.Count == 0) return null;

        return new BotApiMediaInfoDto
        {
            contentType = parsed.ContentType,
            caption = string.IsNullOrWhiteSpace(caption) ? null : caption.Trim(),
            attachments = attachments,
        };
    }

    public static string ToPreview(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "";
        var parsed = TryParse(text);
        if (parsed == null) return text.Length > 120 ? text[..120] + "…" : text;

        return parsed.ContentType switch
        {
            ContentTypeImage => "🖼 " + (ReadString(parsed.Payload, "fileName") ?? "Изображение"),
            ContentTypePhotoAlbum => BuildAlbumPreview(parsed.Payload),
            ContentTypeFile => "📎 " + (ReadString(parsed.Payload, "fileName") ?? "File"),
            ContentTypeMiniApp => "📱 " + (ReadString(parsed.Payload, "title") ?? "Mini App"),
            _ => text.Length > 120 ? text[..120] + "…" : text,
        };
    }

    static string BuildAlbumPreview(JsonElement root)
    {
        var cap = (ReadString(root, "caption") ?? "").Trim();
        if (!string.IsNullOrEmpty(cap)) return cap;
        var count = ReadFileIdArray(root, "fileIds").Count;
        return count > 1 ? $"🖼 {count}" : "🖼";
    }

    static bool TryReadSingleFileId(JsonElement root, out Guid fileId)
    {
        fileId = default;
        if (!root.TryGetProperty("fileId", out var prop)) return false;
        return Guid.TryParse(prop.GetString(), out fileId);
    }

    static bool TryReadSingleAttachment(JsonElement root, out BotApiFileAttachmentDto attachment)
    {
        attachment = new BotApiFileAttachmentDto();
        if (!TryReadSingleFileId(root, out var fileId)) return false;
        attachment.fileId = fileId.ToString();
        attachment.fileName = ReadString(root, "fileName") ?? "";
        attachment.fileSize = ReadLong(root, "fileSize");
        attachment.mimeType = ReadString(root, "mimeType") ?? "";
        return true;
    }

    static List<BotApiFileAttachmentDto> ReadAttachmentArray(JsonElement root)
    {
        var fileIds = ReadStringArray(root, "fileIds");
        var fileNames = ReadStringArray(root, "fileNames");
        var fileSizes = ReadLongArray(root, "fileSizes");
        var mimeTypes = ReadStringArray(root, "mimeTypes");
        var result = new List<BotApiFileAttachmentDto>();
        for (var i = 0; i < fileIds.Count; i++)
        {
            if (!Guid.TryParse(fileIds[i], out _)) continue;
            result.Add(new BotApiFileAttachmentDto
            {
                fileId = fileIds[i],
                fileName = i < fileNames.Count ? fileNames[i] : "",
                fileSize = i < fileSizes.Count ? fileSizes[i] : 0,
                mimeType = i < mimeTypes.Count ? mimeTypes[i] : "",
            });
        }
        return result;
    }

    static List<Guid> ReadMiniAppFileIds(JsonElement root)
    {
        var result = new List<Guid>();
        if (!root.TryGetProperty("files", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return result;
        foreach (var el in arr.EnumerateArray())
        {
            if (!el.TryGetProperty("fileId", out var idProp)) continue;
            if (Guid.TryParse(idProp.GetString(), out var id))
                result.Add(id);
        }
        return result;
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

    static List<string> ReadStringArray(JsonElement root, string propertyName)
    {
        var result = new List<string>();
        if (!root.TryGetProperty(propertyName, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return result;
        foreach (var el in arr.EnumerateArray())
            result.Add(el.GetString() ?? "");
        return result;
    }

    static List<long> ReadLongArray(JsonElement root, string propertyName)
    {
        var result = new List<long>();
        if (!root.TryGetProperty(propertyName, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return result;
        foreach (var el in arr.EnumerateArray())
        {
            if (el.ValueKind == JsonValueKind.Number && el.TryGetInt64(out var n))
                result.Add(n);
            else
                result.Add(0);
        }
        return result;
    }

    static string? ReadString(JsonElement root, string propertyName) =>
        root.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.String
            ? prop.GetString()
            : null;

    static long ReadLong(JsonElement root, string propertyName)
    {
        if (!root.TryGetProperty(propertyName, out var prop)) return 0;
        return prop.ValueKind == JsonValueKind.Number && prop.TryGetInt64(out var n) ? n : 0;
    }
}

public sealed record ParsedMcContent(
    string ContentType,
    JsonElement Payload,
    IReadOnlyList<Guid> FileIds);
