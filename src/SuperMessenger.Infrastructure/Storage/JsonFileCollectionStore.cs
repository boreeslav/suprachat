using System.Text.Json;

namespace SuperMessenger.Infrastructure.Storage;

internal sealed class JsonFileCollectionStore<T>
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public JsonFileCollectionStore(string filePath)
    {
        _filePath = filePath;
        var dir = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);
        if (!File.Exists(filePath))
            File.WriteAllText(filePath, "[]");
    }

    public async Task<List<T>> ReadAllAsync(CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var json = await File.ReadAllTextAsync(_filePath, ct);
            if (string.IsNullOrWhiteSpace(json))
                return [];

            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.ValueKind switch
            {
                JsonValueKind.Array => JsonSerializer.Deserialize<List<T>>(json, JsonOptions) ?? [],
                JsonValueKind.Object =>
                [
                    JsonSerializer.Deserialize<T>(json, JsonOptions)
                        ?? throw new JsonException($"Не удалось прочитать элемент в {_filePath}"),
                ],
                JsonValueKind.Null => [],
                _ => throw new JsonException($"Некорректный формат JSON в {_filePath}: ожидался массив"),
            };
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task WriteAllAsync(List<T> items, CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var json = JsonSerializer.Serialize(items, JsonOptions);
            var temp = _filePath + ".tmp";
            await File.WriteAllTextAsync(temp, json, ct);
            File.Move(temp, _filePath, true);
        }
        finally
        {
            _lock.Release();
        }
    }
}
