using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using SuperMessenger.Core.Abstractions;
using SuperMessenger.Infrastructure.Services;
using SuperMessenger.Infrastructure.Storage;
using SuperMessenger.Web.Hubs;
using SuperMessenger.Web.Middleware;
using SuperMessenger.Web.Services;

var builder = WebApplication.CreateBuilder(args);

var dataRoot = builder.Configuration["Data:Root"] ?? Path.Combine(builder.Environment.ContentRootPath, "data");
Directory.CreateDirectory(dataRoot);

// Persist Data Protection keys so auth cookies survive container restarts
var dpKeysDir = new DirectoryInfo(Path.Combine(dataRoot, "dpkeys"));
dpKeysDir.Create();
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(dpKeysDir)
    .SetApplicationName("SuperMessenger");

builder.Services.AddSingleton<IDataStore>(_ => new FileDataStore(dataRoot));
var filesRoot = builder.Configuration["Data:FilesPath"] ?? Path.Combine(dataRoot, "uploads");
Directory.CreateDirectory(filesRoot);
builder.Services.AddSingleton(sp => new ChatFileService(sp.GetRequiredService<IDataStore>()));
builder.Services.AddSingleton<ChatImageProcessingService>();
builder.Services.AddSingleton<AppAppearanceService>(_ => new AppAppearanceService(dataRoot));
builder.Services.AddSingleton<AppBuildInfoService>();
builder.Services.AddSingleton<IndexShellRenderer>();
builder.Services.AddSingleton<ChatActivityTracker>();
builder.Services.AddSingleton<SupraMessengerService>();
builder.Services.AddSingleton<BotApiService>(sp => new BotApiService(
    sp.GetRequiredService<IDataStore>(),
    sp.GetRequiredService<SupraMessengerService>(),
    sp.GetRequiredService<ChatFileService>()));
builder.Services.AddSingleton<BotWebSocketManager>();
builder.Services.AddSingleton<BotInboxNotifier>();
builder.Services.AddHostedService<BotInboxCleanupService>();
builder.Services.AddHostedService<ChatFileReferenceBootstrap>();
builder.Services.AddSingleton<MessengerSyncService>();
builder.Services.AddSingleton<SupraEncryptionService>();
builder.Services.AddSingleton<RealtimeNotifier>();
builder.Services.AddSingleton(_ => new PushVapidKeyStore(dataRoot, builder.Configuration["App:PublicUrl"]));
builder.Services.AddSingleton(_ => new PushSubscriptionStore(dataRoot));
builder.Services.AddSingleton(_ => new NotificationPreferencesStore(dataRoot));
builder.Services.AddSingleton(_ => new MessengerUserPreferencesStore(dataRoot));
builder.Services.AddSingleton<PushNotificationService>();
builder.Services.AddSingleton<PushDiagnosticLogStore>();
builder.Services.AddSingleton<MessageInfoService>();
builder.Services.AddSingleton<UserPresenceService>();
builder.Services.AddSingleton<UserPresenceNotifier>();
builder.Services.AddHostedService<PresenceMonitorService>();
builder.Services.AddSingleton<UserInvitationService>();
builder.Services.AddSingleton<UserLoginChangeService>();
builder.Services.AddScoped<CurrentUserAccessor>();
builder.Services.AddHttpContextAccessor();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/login.html";
        options.AccessDeniedPath = "/login.html";
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromDays(14);
        options.Events.OnRedirectToLogin = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/api/bot-api") ||
                ctx.Request.Path.StartsWithSegments("/ws/bot"))
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }
            if (ctx.Request.Path.StartsWithSegments("/api") ||
                ctx.Request.Path.StartsWithSegments("/hubs"))
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }
            ctx.Response.Redirect(ctx.RedirectUri);
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/api/bot-api") ||
                ctx.Request.Path.StartsWithSegments("/ws/bot"))
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }
            if (ctx.Request.Path.StartsWithSegments("/api") ||
                ctx.Request.Path.StartsWithSegments("/hubs"))
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            }
            ctx.Response.Redirect(ctx.RedirectUri);
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddSignalR(options =>
{
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(45);
    options.HandshakeTimeout = TimeSpan.FromSeconds(30);
});
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var init = new DataInitializer(
        scope.ServiceProvider.GetRequiredService<IDataStore>(),
        app.Configuration,
        scope.ServiceProvider.GetRequiredService<ILogger<DataInitializer>>());
    await init.InitializeAsync();

    var appearance = scope.ServiceProvider.GetRequiredService<AppAppearanceService>();
    var contentSeeder = new AppAppearanceContentSeeder(appearance, dataRoot);
    await contentSeeder.TrySeedOnceAsync();
    var splashMigrator = new AppAppearanceSplashMigrator(appearance, dataRoot);
    await splashMigrator.MigrateAsync();
    await DeployBrandingBootstrap.ApplyIfPresentAsync(
        appearance,
        app.Environment,
        scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DeployBranding"));
    SyncBuildManifestToData(app.Environment, dataRoot);
}

static void SyncBuildManifestToData(IWebHostEnvironment env, string dataRoot)
{
    var wwwRoot = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
    var wwwManifest = Path.Combine(wwwRoot, "build-manifest.json");
    var dataManifest = Path.Combine(dataRoot, "build-manifest.json");
    if (!File.Exists(wwwManifest)) return;
    try
    {
        if (!File.Exists(dataManifest)
            || File.GetLastWriteTimeUtc(wwwManifest) > File.GetLastWriteTimeUtc(dataManifest))
        {
            File.Copy(wwwManifest, dataManifest, overwrite: true);
        }
    }
    catch
    {
        // best-effort
    }
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});

app.UseRouting();
app.UseWebSockets();
app.UseMiddleware<BotWebSocketMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<ProtectedStaticPageMiddleware>();

app.Use(async (context, next) =>
{
    if (await PublicChannelPage.TryServeAsync(context))
        return;
    await next();
});

app.Use(async (context, next) =>
{
    if (HttpMethods.IsGet(context.Request.Method) &&
        IndexShellRenderer.IsShellPath(context.Request.Path))
    {
        if (await PublicChannelPage.TryServeAsync(context))
            return;

        var renderer = context.RequestServices.GetRequiredService<IndexShellRenderer>();
        var html = await renderer.RenderAsync(context.RequestAborted);
        context.Response.ContentType = "text/html; charset=utf-8";
        context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        await context.Response.WriteAsync(html);
        return;
    }
    await next();
});

app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var path = ctx.Context.Request.Path.Value ?? "";
        if (!path.StartsWith("/messenger/", StringComparison.OrdinalIgnoreCase)) return;

        // Версионированные ассеты (?v=…) — длинный immutable-кеш; без версии — always revalidate.
        var query = ctx.Context.Request.QueryString.Value ?? "";
        if (query.Contains("v=", StringComparison.Ordinal))
        {
            ctx.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
            return;
        }

        ctx.Context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        ctx.Context.Response.Headers.Pragma = "no-cache";
        ctx.Context.Response.Headers.Expires = "0";
    }
});
app.MapControllers();
app.MapHub<MessengerHub>("/hubs/messenger");

app.MapGet("/+{token}", ServeRegisterPage);
app.MapGet("/register/{token}", ServeRegisterPage);

// Do not serve SPA shell for static pages and API
app.MapFallback(async context =>
{
    var path = context.Request.Path.Value ?? "";
    if (path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/hubs/", StringComparison.OrdinalIgnoreCase) ||
        path.StartsWith("/ws/", StringComparison.OrdinalIgnoreCase))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }
    if (await PublicChannelPage.TryServeAsync(context))
        return;
    var renderer = context.RequestServices.GetRequiredService<IndexShellRenderer>();
    var html = await renderer.RenderAsync(context.RequestAborted);
    context.Response.ContentType = "text/html; charset=utf-8";
    context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
    await context.Response.WriteAsync(html);
});

app.Run();

static async Task<IResult> ServeRegisterPage(string token, IWebHostEnvironment env)
{
    _ = token;
    var path = Path.Combine(env.WebRootPath, "register.html");
    var html = await File.ReadAllTextAsync(path);
    return Results.Content(html, "text/html; charset=utf-8");
}
