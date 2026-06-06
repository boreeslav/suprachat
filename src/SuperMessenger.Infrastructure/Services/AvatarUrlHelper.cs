using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public static class AvatarUrlHelper
{
    public static string? ForUser(UserRecord? user)
    {
        if (user == null || string.IsNullOrEmpty(user.AvatarPath)) return null;
        var v = File.Exists(user.AvatarPath)
            ? File.GetLastWriteTimeUtc(user.AvatarPath).Ticks
            : DateTime.UtcNow.Ticks;
        return $"/api/files/avatar/{user.Id}?v={v}";
    }

    public static string? ForGroup(SupraChatRecord? chat)
    {
        if (chat == null || string.IsNullOrEmpty(chat.AvatarPath)) return null;
        var v = File.Exists(chat.AvatarPath)
            ? File.GetLastWriteTimeUtc(chat.AvatarPath).Ticks
            : DateTime.UtcNow.Ticks;
        return $"/api/files/group-avatar/{chat.Id}?v={v}";
    }
}
