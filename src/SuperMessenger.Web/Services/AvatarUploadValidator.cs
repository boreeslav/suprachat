using SixLabors.ImageSharp;

namespace SuperMessenger.Web.Services;

public static class AvatarUploadValidator
{
    public const int MaxDimension = 1200;
    public const long MaxBytes = 2_500_000;

    public static async Task<(bool ok, string? error)> ValidateStreamAsync(Stream stream, CancellationToken ct = default)
    {
        if (stream.CanSeek)
            stream.Position = 0;

        try
        {
            var info = await Image.IdentifyAsync(stream, ct);
            if (info == null)
                return (false, "Не удалось распознать изображение");

            if (info.Width > MaxDimension || info.Height > MaxDimension)
            {
                return (false,
                    $"Изображение не должно превышать {MaxDimension}×{MaxDimension} пикселей " +
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

    public static async Task<(bool ok, string? error)> ValidateUploadAsync(
        IFormFile file,
        CancellationToken ct = default)
    {
        if (file.Length == 0)
            return (false, "Файл пуст");

        if (file.Length > MaxBytes)
            return (false, "Файл слишком большой");

        if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return (false, "Допустимы только изображения");

        await using var stream = file.OpenReadStream();
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, ct);
        return await ValidateStreamAsync(ms, ct);
    }
}
