using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using SuperMessenger.Core.Dtos;

namespace SuperMessenger.Infrastructure.Services;

public static class MiniAppManifestHelper
{
    public const int MaxFiles = 32;
    public const long MaxTotalBytes = 20_000_000;
    public const int MaxPathLength = 200;
    public const int MaxTitleLength = 120;

    public static bool TryParseManifest(string? text, out BotMiniAppManifestDto? manifest)
    {
        manifest = null;
        var parsed = MessageAttachmentParser.TryParse(text);
        if (parsed == null || parsed.ContentType != MessageAttachmentParser.ContentTypeMiniApp)
            return false;

        try
        {
            manifest = JsonSerializer.Deserialize<BotMiniAppManifestDto>(
                parsed.Payload.GetRawText(),
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return manifest != null;
        }
        catch
        {
            return false;
        }
    }

    public static (BotMiniAppManifestDto? manifest, string? error) ValidateOutgoing(BotMiniAppManifestDto? input)
    {
        if (input == null)
            return (null, "Манифест mini app не задан");

        var title = (input.title ?? "").Trim();
        if (string.IsNullOrEmpty(title))
            return (null, "title обязателен");
        if (title.Length > MaxTitleLength)
            return (null, $"title не длиннее {MaxTitleLength} символов");

        var entry = NormalizePath(input.entry);
        if (string.IsNullOrEmpty(entry))
            return (null, "entry обязателен");

        if (input.files == null || input.files.Count == 0)
            return (null, "files обязателен");

        if (input.files.Count > MaxFiles)
            return (null, $"Не более {MaxFiles} файлов в bundle");

        var paths = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var normalizedFiles = new List<BotMiniAppFileDto>();

        foreach (var f in input.files)
        {
            var path = NormalizePath(f.path);
            if (string.IsNullOrEmpty(path))
                return (null, "У каждого файла нужен path");
            if (path.Length > MaxPathLength)
                return (null, $"path слишком длинный: {path}");
            if (!paths.Add(path))
                return (null, $"Дублирующийся path: {path}");
            if (!Guid.TryParse(f.fileId, out _))
                return (null, $"Некорректный fileId для {path}");

            normalizedFiles.Add(new BotMiniAppFileDto { path = path, fileId = f.fileId.Trim() });
        }

        if (!paths.Contains(entry))
            return (null, "entry должен присутствовать в files");

        var baseOrigin = (input.baseOrigin ?? "").Trim();
        if (!string.IsNullOrEmpty(baseOrigin))
        {
            if (!Uri.TryCreate(baseOrigin, UriKind.Absolute, out var uri)
                || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                return (null, "baseOrigin должен быть абсолютным http(s) URL без path");
            baseOrigin = $"{uri.Scheme}://{uri.Authority}";
        }
        else
        {
            baseOrigin = null;
        }

        var manifest = new BotMiniAppManifestDto
        {
            title = title,
            entry = entry,
            files = normalizedFiles,
            initData = input.initData,
            autoOpen = input.autoOpen,
            reusable = input.reusable,
            baseOrigin = baseOrigin,
        };

        return (manifest, null);
    }

    public static string PackMessageText(BotMiniAppManifestDto manifest)
    {
        manifest.bundleHash = ComputeBundleHash(manifest);
        return MessageAttachmentParser.Pack(MessageAttachmentParser.ContentTypeMiniApp, manifest);
    }

    public static string ComputeBundleHash(BotMiniAppManifestDto manifest)
    {
        var sb = new StringBuilder();
        sb.Append(manifest.entry).Append('\n');
        foreach (var f in manifest.files.OrderBy(x => x.path, StringComparer.Ordinal))
            sb.Append(f.path).Append('|').Append(f.fileId).Append('\n');
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
    }

    public static string? NormalizePath(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return null;
        var p = path.Replace('\\', '/').Trim();
        while (p.StartsWith("./", StringComparison.Ordinal)) p = p[2..];
        if (p.StartsWith('/') || p.Contains("..", StringComparison.Ordinal)) return null;
        return p;
    }

    public static string? FindFileId(BotMiniAppManifestDto manifest, string path)
    {
        var normalized = NormalizePath(path);
        if (normalized == null) return null;
        return manifest.files.FirstOrDefault(f =>
            string.Equals(f.path, normalized, StringComparison.OrdinalIgnoreCase))?.fileId;
    }
}
