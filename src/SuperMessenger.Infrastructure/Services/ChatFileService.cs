using SuperMessenger.Core.Abstractions;
using SuperMessenger.Core.Entities;

namespace SuperMessenger.Infrastructure.Services;

public sealed class ChatFileService
{
    private readonly IDataStore _store;

    public ChatFileService(IDataStore store) => _store = store;

    public async Task SyncMessageAttachmentsAsync(
        Guid messageId, Guid chatId, string? text, CancellationToken ct = default)
    {
        var fileIds = MessageAttachmentParser.ExtractFileIds(text);
        await _store.ReplaceMessageFileReferencesAsync(messageId, chatId, fileIds, ct);
    }

    public async Task ReleaseMessageAttachmentsAsync(Guid messageId, CancellationToken ct = default)
    {
        var refs = await _store.GetMessageFileReferencesByMessageAsync(messageId, ct);
        if (refs.Count == 0) return;

        var fileIds = refs.Select(r => r.FileId).Distinct().ToList();
        await _store.DeleteMessageFileReferencesByMessageAsync(messageId, ct);

        foreach (var fileId in fileIds)
            await TryDeleteOrphanFileAsync(fileId, ct);
    }

    public async Task ReleaseChatAttachmentsAsync(Guid chatId, CancellationToken ct = default)
    {
        var messages = await _store.GetMessagesByChatAsync(chatId, ct);
        var affectedFileIds = new HashSet<Guid>();

        foreach (var message in messages)
        {
            var refs = await _store.GetMessageFileReferencesByMessageAsync(message.Id, ct);
            foreach (var r in refs)
                affectedFileIds.Add(r.FileId);
            await _store.DeleteMessageFileReferencesByMessageAsync(message.Id, ct);
        }

        foreach (var fileId in affectedFileIds)
            await TryDeleteOrphanFileAsync(fileId, ct);
    }

    public async Task TryDeleteOrphanFileAsync(Guid fileId, CancellationToken ct = default)
    {
        if (await _store.IsFileReferencedAsync(fileId, ct)) return;

        var file = await _store.GetFileByIdAsync(fileId, ct);
        if (file == null) return;

        DeletePhysicalFile(file);
        await _store.DeleteFileRecordAsync(fileId, ct);
    }

    public async Task<bool> CanUserAccessFileAsync(Guid userId, SupraFileRecord file, CancellationToken ct = default)
    {
        if (await _store.IsParticipantAsync(file.ChatId, userId, ct))
            return true;

        var refs = await _store.GetMessageFileReferencesByFileAsync(file.Id, ct);
        foreach (var r in refs)
        {
            if (await _store.IsParticipantAsync(r.ChatId, userId, ct))
                return true;
        }

        return false;
    }

    public async Task RebuildAllReferencesAsync(CancellationToken ct = default)
    {
        await _store.ClearAllMessageFileReferencesAsync(ct);
        var messages = await _store.GetAllMessagesAsync(ct);
        foreach (var message in messages)
        {
            if (message.DeletedForEveryone) continue;
            var fileIds = MessageAttachmentParser.ExtractFileIds(message.Text);
            if (fileIds.Count == 0) continue;
            await _store.AddMessageFileReferencesAsync(message.Id, message.ChatId, fileIds, ct);
        }
    }

    public async Task GarbageCollectUnreferencedAsync(CancellationToken ct = default)
    {
        var files = await _store.GetAllFilesAsync(ct);
        foreach (var file in files)
            await TryDeleteOrphanFileAsync(file.Id, ct);
    }

    void DeletePhysicalFile(SupraFileRecord file)
    {
        TryDeletePath(file.StoragePath);
        TryDeletePath(file.PreviewPath);
        TryDeletePath(file.MediumPath);

        if (string.IsNullOrEmpty(file.StoragePath)) return;
        var dir = Path.GetDirectoryName(file.StoragePath);
        if (dir == null) return;

        var baseName = file.Id.ToString();
        try
        {
            foreach (var path in Directory.EnumerateFiles(dir, $"{baseName}*"))
                TryDeletePath(path);
        }
        catch
        {
            // Каталог вложений мог быть удалён — не блокируем удаление сообщения.
        }
    }

    static void TryDeletePath(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return;
        try
        {
            if (File.Exists(path))
                File.Delete(path);
        }
        catch
        {
            // Файл мог быть уже удалён вручную — не блокируем операцию.
        }
    }
}
