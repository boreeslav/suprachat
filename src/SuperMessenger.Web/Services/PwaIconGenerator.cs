namespace SuperMessenger.Web.Services;

public static class PwaIconFiles
{
    public const string Icon192 = "icon-192.png";
    public const string Icon512 = "icon-512.png";
    public const string IconMaskable512 = "icon-maskable-512.png";
    public const string AppleTouch180 = "apple-touch-icon-180.png";
    public const string Badge72 = "badge-72.png";

    public static readonly string[] All =
    [
        Icon192,
        Icon512,
        IconMaskable512,
        AppleTouch180,
        Badge72,
    ];

    public static string ApiUrl(string fileName) => $"/api/app/icons/{fileName}";
}

public static class PwaIconGenerator
{
    public static string NormalizeBgColor(string? value, string fallback)
    {
        var v = (value ?? "").Trim();
        if (string.IsNullOrEmpty(v)) return fallback;
        if (!v.StartsWith('#')) v = "#" + v;
        if (v.Length == 4)
        {
            return "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
        }
        return System.Text.RegularExpressions.Regex.IsMatch(v, "^#[0-9a-fA-F]{6}$")
            ? v.ToLowerInvariant()
            : fallback;
    }
}
