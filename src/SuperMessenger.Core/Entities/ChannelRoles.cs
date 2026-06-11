namespace SuperMessenger.Core.Entities;

public static class ChannelRoles
{
    public const string Owner = "owner";
    public const string Admin = "admin";
    public const string Author = "author";
    public const string Subscriber = "subscriber";

    public static bool CanPost(string? role) =>
        string.Equals(role, Owner, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(role, Admin, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(role, Author, StringComparison.OrdinalIgnoreCase);

    public static bool CanEditSettings(string? role, bool includeSlug) =>
        string.Equals(role, Owner, StringComparison.OrdinalIgnoreCase) ||
        (!includeSlug && string.Equals(role, Admin, StringComparison.OrdinalIgnoreCase));

    public static bool CanManageMembers(string? role) =>
        string.Equals(role, Owner, StringComparison.OrdinalIgnoreCase) ||
        string.Equals(role, Admin, StringComparison.OrdinalIgnoreCase);
}
