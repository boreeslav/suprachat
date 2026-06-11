using System.Text.RegularExpressions;
using SuperMessenger.Core.Abstractions;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Публичная страница канала по адресу /@slug для неавторизованных посетителей.
/// </summary>
public static class PublicChannelPage
{
    private static readonly Regex AtSlugPath = new(@"^/@([^/?#]+)$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static bool TryParseSlug(PathString path, out string slug)
    {
        slug = "";
        var p = path.Value ?? "";
        var m = AtSlugPath.Match(p);
        if (!m.Success || Guid.TryParse(m.Groups[1].Value, out _))
            return false;
        slug = Uri.UnescapeDataString(m.Groups[1].Value);
        return slug.Length >= 4;
    }

    public static async Task<bool> TryServeAsync(HttpContext context)
    {
        if (!HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method))
            return false;

        if (context.User?.Identity?.IsAuthenticated == true)
            return false;

        if (!TryParseSlug(context.Request.Path, out var slug))
            return false;

        var store = context.RequestServices.GetRequiredService<IDataStore>();
        var channel = await store.GetChannelBySlugAsync(slug, context.RequestAborted);
        if (channel == null)
            return false;

        var env = context.RequestServices.GetRequiredService<IWebHostEnvironment>();
        var viewPath = Path.Combine(env.WebRootPath, "channel-view.html");
        if (!File.Exists(viewPath))
            return false;

        context.Response.ContentType = "text/html; charset=utf-8";
        context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        if (HttpMethods.IsHead(context.Request.Method))
            return true;

        var html = await File.ReadAllTextAsync(viewPath, context.RequestAborted);
        await context.Response.WriteAsync(html, context.RequestAborted);
        return true;
    }
}
