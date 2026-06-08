using SixLabors.ImageSharp;

namespace SuperMessenger.Web.Services;

public static class ThemeChatBgImageUploadValidator
{
    public const int MaxDimension = 2048;
    public const long MaxBytes = 3_000_000;

    static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png", ".jpg", ".jpeg",
    };

    public static async Task<(bool ok, string? error, string extension)> ValidateUploadAsync(
        IFormFile file,
        CancellationToken ct = default)
    {
        if (file.Length == 0)
            return (false, "Файл пуст", ".png");

        if (file.Length > MaxBytes)
            return (false, $"Изображение не больше {MaxBytes / 1_000_000} МБ", ".png");

        var ext = NormalizeExtension(Path.GetExtension(file.FileName));
        var contentType = (file.ContentType ?? "").Trim();

        if (!AllowedExtensions.Contains(ext)
            && contentType is not ("image/png" or "image/jpeg"))
        {
            return (false, "Фон чата: только PNG или JPEG", ".png");
        }

        await using var stream = file.OpenReadStream();
        var (valid, error) = await ValidateStreamAsync(stream, ct);
        if (!valid)
            return (false, error, ext);

        return (true, null, ext == ".jpeg" ? ".jpg" : ext);
    }

    public static async Task<(bool ok, string? error)> ValidateStreamAsync(Stream stream, CancellationToken ct = default)
    {
        if (stream.CanSeek)
            stream.Position = 0;

        try
        {
            var info = await Image.IdentifyAsync(stream, ct);
            if (info == null)
                return (false, "Не удалось распознать изображение");

            var format = info.Metadata.DecodedImageFormat?.Name ?? "";
            if (!format.Equals("PNG", StringComparison.OrdinalIgnoreCase)
                && !format.Equals("JPEG", StringComparison.OrdinalIgnoreCase))
            {
                return (false, "Фон чата: только PNG или JPEG");
            }

            if (info.Width > MaxDimension || info.Height > MaxDimension)
            {
                return (false,
                    $"Изображение не больше {MaxDimension}×{MaxDimension} пикселей " +
                    $"(загружено {info.Width}×{info.Height})");
            }

            return (true, null);
        }
        catch
        {
            return (false, "Некорректный формат изображения");
        }
        finally
        {
            if (stream.CanSeek)
                stream.Position = 0;
        }
    }

    public static string GetContentType(string extension) =>
        extension.ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream",
        };

    static string NormalizeExtension(string ext)
    {
        ext = (ext ?? "").Trim().ToLowerInvariant();
        return ext switch
        {
            ".jpeg" => ".jpg",
            ".png" or ".jpg" => ext,
            _ => ".png",
        };
    }
}
