namespace SuperMessenger.Web.Services;

public static class InviteLinkBuilder
{
    public static string Build(IConfiguration config, HttpRequest? request, string token)
    {
        var baseUrl = config["App:PublicUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl) && request != null)
            baseUrl = $"{request.Scheme}://{request.Host}";
        if (string.IsNullOrWhiteSpace(baseUrl))
            baseUrl = "http://localhost";
        return $"{baseUrl.TrimEnd('/')}/register/{token}";
    }
}
