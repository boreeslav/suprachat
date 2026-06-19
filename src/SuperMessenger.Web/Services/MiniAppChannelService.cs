using System.Collections.Concurrent;
using System.Text;
using SuperMessenger.Core.Dtos;

namespace SuperMessenger.Web.Services;

/// <summary>
/// In-memory очередь сообщений бот → mini app для активной сессии.
/// Живёт вместе с <see cref="MiniAppSessionService"/> (TTL сессии).
/// </summary>
public sealed class MiniAppChannelService
{
    public const int MaxQueueSize = 100;

    private readonly ConcurrentDictionary<string, SessionChannel> _byToken = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<(Guid MessageId, Guid ViewerUserId), string> _byMessageUser = new();
    private readonly MiniAppWebSocketManager _webSockets;

    public MiniAppChannelService(MiniAppWebSocketManager webSockets)
    {
        _webSockets = webSockets;
    }

    public void RegisterSession(MiniAppSessionService.MiniAppSession session)
    {
        var channel = _byToken.GetOrAdd(session.Token, _ => new SessionChannel());
        channel.BotUserId = session.BotUserId;
        channel.MessageId = session.MessageId;
        channel.ViewerUserId = session.ViewerUserId;
        _byMessageUser[(session.MessageId, session.ViewerUserId)] = session.Token;
    }

    public void UnregisterSession(string token)
    {
        if (!_byToken.TryRemove(token, out var channel)) return;
        _byMessageUser.TryRemove((channel.MessageId, channel.ViewerUserId), out _);
    }

    public (bool ok, long seq, string? error) Enqueue(
        Guid botUserId,
        string sessionToken,
        string payloadJson)
    {
        if (Encoding.UTF8.GetByteCount(payloadJson) > MiniAppSessionService.MaxPayloadBytes)
            return (false, 0, "Payload слишком большой");

        if (!_byToken.TryGetValue(sessionToken.Trim(), out var channel))
            return (false, 0, "Сессия mini app не активна");

        if (channel.BotUserId != botUserId)
            return (false, 0, "Сессия принадлежит другому боту");

        var seq = channel.Enqueue(payloadJson);
        _ = _webSockets.SendDataAsync(sessionToken.Trim(), seq, payloadJson);
        return (true, seq, null);
    }

    public (bool ok, long seq, string? error) EnqueueByMessageUser(
        Guid botUserId,
        Guid miniAppMessageId,
        Guid viewerUserId,
        string payloadJson)
    {
        if (!_byMessageUser.TryGetValue((miniAppMessageId, viewerUserId), out var token))
            return (false, 0, "Сессия mini app не активна");

        return Enqueue(botUserId, token, payloadJson);
    }

    public MiniAppPollResponseDto Poll(string sessionToken, long afterSeq)
    {
        if (!_byToken.TryGetValue(sessionToken.Trim(), out var channel))
        {
            return new MiniAppPollResponseDto
            {
                success = false,
                error = "Сессия истекла",
            };
        }

        var messages = channel.GetAfter(afterSeq);
        return new MiniAppPollResponseDto
        {
            success = true,
            messages = messages,
            lastSeq = channel.LastSeq,
        };
    }

    sealed class SessionChannel
    {
        readonly object _lock = new();
        readonly List<MiniAppChannelMessageDto> _messages = [];
        long _nextSeq = 1;

        public Guid BotUserId { get; set; }
        public Guid MessageId { get; set; }
        public Guid ViewerUserId { get; set; }
        public long LastSeq { get; private set; }

        public long Enqueue(string payloadJson)
        {
            lock (_lock)
            {
                var seq = _nextSeq++;
                _messages.Add(new MiniAppChannelMessageDto
                {
                    seq = seq,
                    payloadJson = payloadJson,
                    timestamp = DateTime.UtcNow.ToString("O"),
                });
                LastSeq = seq;

                while (_messages.Count > MaxQueueSize)
                    _messages.RemoveAt(0);

                return seq;
            }
        }

        public List<MiniAppChannelMessageDto> GetAfter(long afterSeq)
        {
            lock (_lock)
            {
                return _messages
                    .Where(m => m.seq > afterSeq)
                    .Select(m => new MiniAppChannelMessageDto
                    {
                        seq = m.seq,
                        payloadJson = m.payloadJson,
                        timestamp = m.timestamp,
                    })
                    .ToList();
            }
        }
    }
}
