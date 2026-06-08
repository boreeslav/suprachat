using System.Text;

namespace SuperMessenger.Web.Services;

public static class LogoUploadValidator
{
    public const long MaxSvgBytes = 512_000;

    public static async Task<(bool ok, string? error, string extension)> ValidateUploadAsync(
        IFormFile file,
        CancellationToken ct = default)
    {
        if (file.Length == 0)
            return (false, "Файл пуст", ".svg");

        var ext = NormalizeExtension(Path.GetExtension(file.FileName));
        var contentType = (file.ContentType ?? "").Trim();

        if (ext != ".svg" && !contentType.Equals("image/svg+xml", StringComparison.OrdinalIgnoreCase))
            return (false, "Логотип должен быть в формате SVG", ".svg");

        return await ValidateSvgUploadAsync(file, ct);
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
        return ext == ".svg" ? ext : ".svg";
    }
}
