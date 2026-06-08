using SuperMessenger.Web.Services;

namespace SuperMessenger.Web.Middleware;

/// <summary>
/// Отдаёт защищённые HTML-страницы только после проверки cookie-авторизации на сервере.
/// </summary>
public sealed class ProtectedStaticPageMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IWebHostEnvironment _env;

    public ProtectedStaticPageMiddleware(RequestDelegate next, IWebHostEnvironment env)
    {
        _next = next;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method))
        {
            await _next(context);
            return;
        }

        if (!ProtectedStaticPageGate.TryMatch(context.Request.Path, out var requireAdmin))
        {
            await _next(context);
            return;
        }

        if (!ProtectedStaticPageGate.IsAllowed(context.User, requireAdmin))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        var relative = context.Request.Path.Value!.TrimStart('/');
        var filePath = Path.Combine(_env.WebRootPath, relative);
        if (!File.Exists(filePath))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        context.Response.ContentType = "text/html; charset=utf-8";
        context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        if (HttpMethods.IsHead(context.Request.Method))
            return;

        await context.Response.SendFileAsync(filePath, context.RequestAborted);
    }
}
