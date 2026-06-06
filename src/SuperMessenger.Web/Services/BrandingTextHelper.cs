using System.Net;
using System.Text;
using System.Text.RegularExpressions;

namespace SuperMessenger.Web.Services;

/// <summary>
/// Подстановка названия приложения в HTML и очистка шаблонного changelog после деплоев.
/// </summary>
public static class BrandingTextHelper
{
    static readonly Regex ChangelogBlockRegex = new(
        @"<h3\b[^>]*>(?<title>.*?)</h3>\s*<ul>(?<items>.*?)</ul>",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    static readonly Regex ListItemRegex = new(
        @"<li\b[^>]*>(?<text>.*?)</li>",
        RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled);

    public static string SubstituteAppName(string? html, string? appName)
    {
        var text = html ?? "";
        var name = (appName ?? "").Trim();
        if (text.Length == 0 || name.Length == 0)
            return text;

        var encoded = WebUtility.HtmlEncode(name);
        if (text.Contains("{{appName}}", StringComparison.OrdinalIgnoreCase))
            return Regex.Replace(text, @"\{\{appName\}\}", encoded, RegexOptions.IgnoreCase);

        return text
            .Replace("Supra Messenger", encoded, StringComparison.OrdinalIgnoreCase)
            .Replace("SuperMessenger", encoded, StringComparison.OrdinalIgnoreCase);
    }

    public static string CompactGenericChangelog(string? html)
    {
        var source = (html ?? "").Trim();
        if (source.Length == 0)
            return source;

        var blocks = new List<(string Title, List<string> Items)>();
        foreach (Match match in ChangelogBlockRegex.Matches(source))
        {
            var title = StripTags(match.Groups["title"].Value).Trim();
            var items = new List<string>();
            foreach (Match li in ListItemRegex.Matches(match.Groups["items"].Value))
            {
                var line = StripTags(li.Groups["text"].Value).Trim();
                if (line.Length > 0)
                    items.Add(line);
            }
            if (title.Length > 0 && items.Count > 0)
                blocks.Add((title, items));
        }

        if (blocks.Count == 0)
            return source;

        var genericOnly = blocks.All(b =>
            b.Items.Count == 1 && IsGenericChangelogLine(b.Items[0]));

        if (!genericOnly && blocks.All(b => b.Items.All(IsGenericChangelogLine)))
            genericOnly = true;

        if (!genericOnly)
        {
            var merged = new List<(string Title, List<string> Items)>();
            List<(string Title, List<string> Items)>? genericRun = null;

            void FlushGenericRun()
            {
                if (genericRun == null || genericRun.Count == 0) return;
                if (genericRun.Count == 1)
                {
                    merged.Add(genericRun[0]);
                }
                else
                {
                    var firstVer = ExtractVersion(genericRun[^1].Title);
                    var lastVer = ExtractVersion(genericRun[0].Title);
                    var title = firstVer != null && lastVer != null && !string.Equals(firstVer, lastVer, StringComparison.Ordinal)
                        ? $"{firstVer} — {lastVer}"
                        : (lastVer ?? firstVer ?? genericRun[0].Title);
                    merged.Add((title, ["Технические обновления и исправления"]));
                }
                genericRun = null;
            }

            foreach (var block in blocks)
            {
                if (block.Items.All(IsGenericChangelogLine))
                {
                    genericRun ??= [];
                    genericRun.Add(block);
                }
                else
                {
                    FlushGenericRun();
                    merged.Add(block);
                }
            }
            FlushGenericRun();
            blocks = merged;
        }
        else if (blocks.Count > 1)
        {
            var firstVer = ExtractVersion(blocks[^1].Title);
            var lastVer = ExtractVersion(blocks[0].Title);
            var title = firstVer != null && lastVer != null && !string.Equals(firstVer, lastVer, StringComparison.Ordinal)
                ? $"{firstVer} — {lastVer}"
                : (lastVer ?? firstVer ?? blocks[0].Title);
            blocks =
            [
                (title, ["Технические обновления и исправления"]),
            ];
        }

        var sb = new StringBuilder();
        foreach (var (title, items) in blocks)
        {
            sb.Append("<h3>").Append(Escape(title)).Append("</h3><ul>");
            foreach (var item in items)
                sb.Append("<li>").Append(Escape(item)).Append("</li>");
            sb.Append("</ul>\n");
        }
        return sb.ToString().Trim();
    }

    public static bool IsGenericChangelogLine(string? line)
    {
        var t = (line ?? "").Trim();
        if (t.Length == 0) return true;
        return t.Equals("App update", StringComparison.OrdinalIgnoreCase)
            || t.Equals("Обновление приложения", StringComparison.OrdinalIgnoreCase)
            || t.Equals("Техническое обновление", StringComparison.OrdinalIgnoreCase);
    }

    static string? ExtractVersion(string title)
    {
        var m = Regex.Match(title, @"(\d+\.\d+(?:\.\d+)?)");
        return m.Success ? m.Groups[1].Value : null;
    }

    static string StripTags(string value) =>
        Regex.Replace(value, "<[^>]+>", "", RegexOptions.Singleline).Trim();

    static string Escape(string value) =>
        value.Replace("&", "&amp;", StringComparison.Ordinal)
            .Replace("<", "&lt;", StringComparison.Ordinal)
            .Replace(">", "&gt;", StringComparison.Ordinal);
}
