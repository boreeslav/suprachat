using System.Security.Claims;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Серверная политика доступа к HTML-страницам из wwwroot.
/// Неавторизованным и не имеющим прав пользователям возвращается 404 до отдачи контента.
/// </summary>
public static class ProtectedStaticPageGate
{
    private sealed record PageRule(string Path, bool RequireAdmin);

    private static readonly PageRule[] Pages =
    [
        new("/admin.html", RequireAdmin: true),
        new("/profile.html", RequireAdmin: false),
    ];

    public static bool TryMatch(PathString requestPath, out bool requireAdmin)
    {
        var p = requestPath.Value ?? "";
        foreach (var page in Pages)
        {
            if (string.Equals(p, page.Path, StringComparison.OrdinalIgnoreCase))
            {
                requireAdmin = page.RequireAdmin;
                return true;
            }
        }

        requireAdmin = false;
        return false;
    }

    public static bool IsAllowed(ClaimsPrincipal? user, bool requireAdmin)
    {
        if (user?.Identity?.IsAuthenticated != true)
            return false;
        if (requireAdmin && !user.IsInRole("Admin"))
            return false;
        return true;
    }
}
