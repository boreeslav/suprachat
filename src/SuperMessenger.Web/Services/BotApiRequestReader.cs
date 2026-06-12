namespace SuperMessenger.Web.Services;

public static class BotApiRequestReader
{
    public sealed class Credentials
    {
        public string? Login { get; init; }
        public string? Token { get; init; }

        public bool IsComplete =>
            !string.IsNullOrWhiteSpace(Login) && !string.IsNullOrWhiteSpace(Token);
    }

    /// <summary>login и token — только query-параметры URL.</summary>
    public static Credentials ReadQueryCredentials(HttpRequest request)
    {
        var login = FirstNonEmpty(
            request.Query["login"].ToString(),
            request.Query["bot"].ToString());

        var token = request.Query["token"].ToString().Trim();
        if (string.IsNullOrEmpty(token))
            token = null;

        return new Credentials
        {
            Login = string.IsNullOrWhiteSpace(login) ? null : login.Trim(),
            Token = token,
        };
    }

    static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var v in values)
        {
            if (!string.IsNullOrWhiteSpace(v))
                return v.Trim();
        }
        return null;
    }
}
