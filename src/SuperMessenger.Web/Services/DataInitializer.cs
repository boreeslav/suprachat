using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Entities;
using SuperMessenger.Infrastructure.Security;

namespace SuperMessenger.Web.Services;

public sealed class DataInitializer
{
    private readonly IDataStore _store;
    private readonly IConfiguration _config;
    private readonly ILogger<DataInitializer> _log;

    public DataInitializer(IDataStore store, IConfiguration config, ILogger<DataInitializer> log)
    {
        _store = store;
        _config = config;
        _log = log;
    }

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        var users = await _store.GetUsersAsync(ct);
        if (users.Count > 0) return;

        var login = _config["Admin:Login"] ?? "admin";
        var password = _config["Admin:Password"] ?? "admin";
        var admin = new UserRecord
        {
            Id = Guid.NewGuid(),
            Login = login,
            DisplayName = "Администратор",
            PasswordHash = PasswordHasher.Hash(password),
            Type = UserType.Admin,
            IsActive = true,
        };
        await _store.SaveUserAsync(admin, ct);
        _log.LogWarning("Создан администратор по умолчанию: логин={Login}. Смените пароль после первого входа.", login);
    }
}
