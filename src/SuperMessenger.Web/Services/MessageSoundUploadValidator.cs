namespace SuperMessenger.Web.Services;

public static class MessageSoundUploadValidator
{
    public const long MaxBytes = 2_000_000;

    static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".mp3", ".ogg", ".wav", ".webm", ".m4a",
    };

    static readonly Dictionary<string, string> ContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".mp3"] = "audio/mpeg",
        [".ogg"] = "audio/ogg",
        [".wav"] = "audio/wav",
        [".webm"] = "audio/webm",
        [".m4a"] = "audio/mp4",
    };

    public static async Task<(bool ok, string? error, string extension)> ValidateUploadAsync(
        IFormFile file,
        CancellationToken ct = default)
    {
        if (file.Length == 0)
            return (false, "Файл пуст", ".mp3");

        if (file.Length > MaxBytes)
            return (false, $"Звук не больше {MaxBytes / 1_000_000} МБ", ".mp3");

        var ext = NormalizeExtension(Path.GetExtension(file.FileName));
        if (!AllowedExtensions.Contains(ext))
            return (false, "Допустимы MP3, OGG, WAV, WebM или M4A", ext);

        var contentType = (file.ContentType ?? "").Trim();
        if (!string.IsNullOrEmpty(contentType)
            && !contentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase)
            && contentType != "application/octet-stream")
        {
            return (false, "Файл должен быть аудио", ext);
        }

        await using var stream = file.OpenReadStream();
        var header = new byte[12];
        var read = await stream.ReadAsync(header.AsMemory(0, header.Length), ct);
        if (read < 4)
            return (false, "Файл слишком короткий", ext);

        if (!LooksLikeAudio(header, read, ext))
            return (false, "Файл не похож на аудио", ext);

        return (true, null, ext);
    }

    public static string GetContentType(string extension)
    {
        extension = NormalizeExtension(extension);
        return ContentTypes.TryGetValue(extension, out var ct) ? ct : "application/octet-stream";
    }

    static bool LooksLikeAudio(byte[] header, int len, string ext)
    {
        if (len >= 3 && header[0] == 0x49 && header[1] == 0x44 && header[2] == 0x33)
            return true;
        if (len >= 2 && header[0] == 0xFF && (header[1] & 0xE0) == 0xE0)
            return true;
        if (len >= 4 && header[0] == 0x4F && header[1] == 0x67 && header[2] == 0x67 && header[3] == 0x53)
            return true;
        if (len >= 4 && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46)
            return true;
        if (len >= 4 && header[0] == 0x1A && header[1] == 0x45 && header[2] == 0xDF && header[3] == 0xA3)
            return true;
        if (ext is ".m4a" or ".mp3")
            return true;
        return false;
    }

    static string NormalizeExtension(string ext)
    {
        ext = (ext ?? "").Trim().ToLowerInvariant();
        return AllowedExtensions.Contains(ext) ? ext : ".mp3";
    }
}
