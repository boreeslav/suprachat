using SuperMessenger.Infrastructure.Services;

namespace SuperMessenger.Web.Services;

/// <summary>Пересборка ссылок сообщений на файлы и очистка осиротевших вложений при старте.</summary>
public sealed class ChatFileReferenceBootstrap : IHostedService
{
    private readonly ChatFileService _files;
    private readonly ILogger<ChatFileReferenceBootstrap> _log;

    public ChatFileReferenceBootstrap(ChatFileService files, ILogger<ChatFileReferenceBootstrap> log)
    {
        _files = files;
        _log = log;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _files.RebuildAllReferencesAsync(cancellationToken);
            await _files.GarbageCollectUnreferencedAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Не удалось пересобрать ссылки на файлы при старте");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
