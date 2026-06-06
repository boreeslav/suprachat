using System.Text;
using SixLabors.ImageSharp;

namespace SuperMessenger.Web.Services;

public static class LogoUploadValidator
{
    public const int MaxRasterDimension = 2048;
    public const long MaxRasterBytes = 3_000_000;
    public const long MaxSvgBytes = 512_000;

    static readonly HashSet<string> RasterExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png", ".jpg", ".jpeg", ".webp", ".gif",
    };

    public static async Task<(bool ok, string? error, string extension)> ValidateUploadAsync(
        IFormFile file,
        CancellationToken ct = default)
    {
        if (file.Length == 0)
            return (false, "Файл пуст", ".png");

        var ext = NormalizeExtension(Path.GetExtension(file.FileName));
        var contentType = (file.ContentType ?? "").Trim();

        if (ext == ".svg" || contentType.Equals("image/svg+xml", StringComparison.OrdinalIgnoreCase))
            return await ValidateSvgUploadAsync(file, ct);

        if (!RasterExtensions.Contains(ext)
            && !contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return (false, "Допустимы PNG, JPEG, WebP, GIF или SVG", ".png");

        if (file.Length > MaxRasterBytes)
            return (false, $"Растровое изображение не больше {MaxRasterBytes / 1_000_000} МБ", ext);

        await using var stream = file.OpenReadStream();
        await using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, ct);
        return await ValidateRasterStreamAsync(ms, ext, ct);
    }

    static async Task<(bool ok, string? error, string extension)> ValidateRasterStreamAsync(
        MemoryStream ms,
        string ext,
        CancellationToken ct)
    {
        ms.Position = 0;
        try
        {
            var info = await Image.IdentifyAsync(ms, ct);
            if (info == null)
                return (false, "Не удалось распознать изображение", ext);

            if (info.Width > MaxRasterDimension || info.Height > MaxRasterDimension)
            {
                return (false,
                    $"Логотип не больше {MaxRasterDimension}×{MaxRasterDimension} пикселей " +
                    $"(загружено {info.Width}×{info.Height})",
                    ext);
            }

            return (true, null, ext == ".jpeg" ? ".jpg" : ext);
        }
        catch
        {
            return (false, "Некорректный формат изображения", ext);
        }
    }

    static async Task<(bool ok, string? error, string extension)> ValidateSvgUploadAsync(
        IFormFile file,
        CancellationToken ct)
    {
        if (file.Length > MaxSvgBytes)
            return (false, $"SVG не больше {MaxSvgBytes / 1000} КБ", ".svg");

        await using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        var text = await reader.ReadToEndAsync(ct);
        if (string.IsNullOrWhiteSpace(text))
            return (false, "Файл пуст", ".svg");

        var trimmed = text.TrimStart();
        if (!trimmed.StartsWith("<svg", StringComparison.OrdinalIgnoreCase)
            && !trimmed.StartsWith("<?xml", StringComparison.OrdinalIgnoreCase))
            return (false, "Файл не похож на SVG", ".svg");

        if (text.Contains("<script", StringComparison.OrdinalIgnoreCase))
            return (false, "SVG не должен содержать скрипты", ".svg");

        return (true, null, ".svg");
    }

    static string NormalizeExtension(string ext)
    {
        ext = (ext ?? "").Trim().ToLowerInvariant();
        return ext switch
        {
            ".jpeg" => ".jpg",
            ".png" or ".jpg" or ".webp" or ".gif" or ".svg" => ext,
            _ => ".png",
        };
    }
}
