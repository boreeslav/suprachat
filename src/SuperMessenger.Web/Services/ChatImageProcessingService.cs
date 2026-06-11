using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;

namespace SuperMessenger.Web.Services;

public sealed class ChatImageProcessingService
{
    /// <summary>Макс. сторона превью для чата (аналог клиентского thumb).</summary>
    public const int PreviewMaxDimension = 960;

    /// <summary>Макс. сторона среднего качества для просмотра.</summary>
    public const int MediumMaxDimension = 1920;

    private static readonly JpegEncoder PreviewEncoder = new() { Quality = 88 };
    private static readonly JpegEncoder MediumEncoder = new() { Quality = 90 };

    public static bool IsProcessableImage(string? mimeType, string? fileName)
    {
        if (mimeType?.StartsWith("image/", StringComparison.OrdinalIgnoreCase) == true)
        {
            if (mimeType.Contains("gif", StringComparison.OrdinalIgnoreCase)) return false;
            if (mimeType.Contains("svg", StringComparison.OrdinalIgnoreCase)) return false;
            return true;
        }

        return Path.GetExtension(fileName ?? "").ToLowerInvariant() is
            ".jpg" or ".jpeg" or ".png" or ".webp" or ".bmp" or ".heic" or ".heif";
    }

    public async Task<(string previewPath, string mediumPath)> ProcessAsync(
        string originalPath,
        Guid fileId,
        CancellationToken ct = default)
    {
        var dir = Path.GetDirectoryName(originalPath)!;
        var previewPath = Path.Combine(dir, $"{fileId}_preview.jpg");
        var mediumPath = Path.Combine(dir, $"{fileId}_medium.jpg");

        await using var stream = System.IO.File.OpenRead(originalPath);
        using var image = await Image.LoadAsync(stream, ct);
        image.Mutate(x => x.AutoOrient());

        await SaveVariantAsync(image, previewPath, PreviewMaxDimension, PreviewEncoder, ct);
        await SaveVariantAsync(image, mediumPath, MediumMaxDimension, MediumEncoder, ct);

        return (previewPath, mediumPath);
    }

    private static async Task SaveVariantAsync(
        Image source,
        string destPath,
        int maxDim,
        JpegEncoder encoder,
        CancellationToken ct)
    {
        using var variant = source.Clone(ctx =>
        {
            var w = source.Width;
            var h = source.Height;
            if (w > maxDim || h > maxDim)
            {
                if (w >= h)
                    ctx.Resize(maxDim, (int)Math.Round(h * (double)maxDim / w));
                else
                    ctx.Resize((int)Math.Round(w * (double)maxDim / h), maxDim);
            }
        });
        await variant.SaveAsJpegAsync(destPath, encoder, ct);
    }
}
