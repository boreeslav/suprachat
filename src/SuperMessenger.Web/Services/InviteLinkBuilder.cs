using System.Globalization;

namespace SuperMessenger.Web.Services;

public static class InviteLinkBuilder
{
    /// <summary>Короткая ссылка для копирования: чаучат.рф/+rG87JhY</summary>
    public static string Build(IConfiguration config, HttpRequest? request, string token)
        => $"{GetDisplayHost(config, request)}/+{token}";

    /// <summary>Полный URL для открытия и QR-кода.</summary>
    public static string BuildAbsolute(IConfiguration config, HttpRequest? request, string token)
        => $"{GetScheme(config, request)}://{GetDisplayHost(config, request)}/+{token}";

    private static string GetScheme(IConfiguration config, HttpRequest? request)
    {
        var publicUrl = config["App:PublicUrl"];
        if (!string.IsNullOrWhiteSpace(publicUrl) && Uri.TryCreate(publicUrl.Trim(), UriKind.Absolute, out var uri))
            return uri.Scheme;
        return request?.Scheme ?? "https";
    }

    private static string GetDisplayHost(IConfiguration config, HttpRequest? request)
    {
        var publicUrl = config["App:PublicUrl"];
        if (!string.IsNullOrWhiteSpace(publicUrl) && Uri.TryCreate(publicUrl.Trim(), UriKind.Absolute, out var uri))
            return ToUnicodeHost(uri.Authority);

        if (request != null)
            return ToUnicodeHost(request.Host.Value);

        return "localhost";
    }

    private static string ToUnicodeHost(string host)
    {
        try
        {
            var idn = new IdnMapping();
            var portSep = host.LastIndexOf(':');
            if (portSep > 0 && host.AsSpan(0, portSep).LastIndexOf(']') < 0)
            {
                var hostname = host[..portSep];
                var port = host[portSep..];
                return idn.GetUnicode(hostname) + port;
            }

            return idn.GetUnicode(host);
        }
        catch (ArgumentException)
        {
            return host;
        }
    }
}
