using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using CastLibrary.WebHost.Filters;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.IoC;
using CastLibrary.WebHost.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Force unbuffered console output for DigitalOcean App Platform visibility
Console.OutputEncoding = System.Text.Encoding.UTF8;
System.Environment.SetEnvironmentVariable("DOTNET_TargetFramework", "net10.0");

builder.Logging.ClearProviders();
builder.Logging.AddConsole(options =>
{
    options.IncludeScopes = true;
    options.TimestampFormat = "yyyy-MM-dd HH:mm:ss ";
});

// DO App Platform injects secrets as plain env vars; ${VAR} interpolation in app.yaml
// doesn't resolve reliably, so read DB_CONNECTION_STRING directly and inject it into
// the config hierarchy so all downstream code (repositories, health checks) works unchanged.
var dbConnectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");
if (dbConnectionString != null)
    builder.Configuration["ConnectionStrings:DefaultConnection"] = dbConnectionString;

var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_BASE_URL");
if (frontendUrl != null)
{
    builder.Configuration["AllowedOrigins"] = frontendUrl;
    builder.Configuration["Email:FrontendBaseUrl"] = frontendUrl;
}

var jwtKeyEnv = Environment.GetEnvironmentVariable("JWT_KEY");
if (jwtKeyEnv != null)
    builder.Configuration["Jwt:Key"] = jwtKeyEnv;

builder.Services.AddApplicationInsightsTelemetry();

builder.Services.AddControllers(options =>
{
    options.Filters.Add<RequestLoggingAndExceptionFilter>();
})
    .AddJsonOptions(opts =>
        opts.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddSignalR();

// Configure CORS - support both localhost for development and environment-based URLs
var allowedOrigins = builder.Configuration["AllowedOrigins"]?.Split(";", StringSplitOptions.RemoveEmptyEntries)
    ?? new[] { "http://localhost:4200" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("Angular", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        };

        // Allow JWT from SignalR query string
        opts.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddCastLibraryServices(builder.Configuration);

var app = builder.Build();

// Direct console output to verify app is running
Console.WriteLine("=== Cast Library API Started ===");
Console.WriteLine($"Environment: {app.Environment.EnvironmentName}");
Console.WriteLine($"Listening on: {Environment.GetEnvironmentVariable("ASPNETCORE_URLS")}");
Console.WriteLine("===============================");
Console.Out.Flush();

app.UseCors("Angular");

// Log all incoming requests for debugging
app.Use(async (context, next) =>
{
    Console.WriteLine($"[REQUEST] {context.Request.Method} {context.Request.Path} from {context.Connection.RemoteIpAddress}");
    await next();
    Console.WriteLine($"[RESPONSE] {context.Request.Method} {context.Request.Path} => {context.Response.StatusCode}");
    Console.Out.Flush();
});

// ── Path prefix restore ───────────────────────────────────────────────────────
// DO App Platform strips the matched ingress prefix (/api, /hubs, /images)
// before forwarding to the container. All controllers are routed under api/,
// so re-add the prefix when it is missing.
app.Use(async (context, next) =>
{
    var originalPath = context.Request.Path.Value;
    var path = context.Request.Path;
    if (!path.StartsWithSegments("/api") &&
        !path.StartsWithSegments("/hubs") &&
        !path.StartsWithSegments("/health"))
    {
        context.Request.Path = "/api" + path;
        Console.WriteLine($"[PATH_RESTORE] Modified path from '{originalPath}' to '{context.Request.Path}'");
    }
    Console.Out.Flush();
    await next();
});

// ── Routing ───────────────────────────────────────────────────────────────────
// Must be called EXPLICITLY here, AFTER path prefix restore.
// If omitted, ASP.NET Core places UseRouting() at the very start of the pipeline
// (before our path restoration middleware), so the router sees /auth/login instead
// of /api/auth/login and every controller route returns 404.
app.UseRouting();

// ── Correlation ID ────────────────────────────────────────────────────────────
// Must run before UseAuthentication so trace_id is available on every log entry,
// including auth failures.
app.UseMiddleware<CorrelationIdMiddleware>();

var imagesPath = builder.Configuration["ImageStorage:LocalPath"]!;
if (Directory.Exists(imagesPath))
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(imagesPath),
        RequestPath = "/images"
    });

app.UseAuthentication();
app.UseAuthorization();

// Log before routing
app.Use(async (context, next) =>
{
    Console.WriteLine($"[PRE_ROUTING] Path: {context.Request.Path}, Method: {context.Request.Method}");
    Console.Out.Flush();
    await next();
});

app.MapControllers();

// Log registered routes after mapping
var actionDescriptorCollectionProvider = app.Services
    .GetRequiredService<Microsoft.AspNetCore.Mvc.Infrastructure.IActionDescriptorCollectionProvider>();

Console.WriteLine("[STARTUP] Registered controller actions:");
foreach (var descriptor in actionDescriptorCollectionProvider.ActionDescriptors.Items.OfType<Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor>())
{
    var template = descriptor.AttributeRouteInfo?.Template ?? "N/A";
    Console.WriteLine($"  {descriptor.ControllerName}.{descriptor.ActionName} -> {template}");
}
Console.Out.Flush();

// Log after routing
app.Use(async (context, next) =>
{
    Console.WriteLine($"[POST_ROUTING] Path: {context.Request.Path}, Status: {context.Response.StatusCode}");
    Console.Out.Flush();
    await next();
});

app.MapHealthChecks("/health");      // DO internal probe hits container directly
app.MapHealthChecks("/api/health");  // public path after preserve_path_prefix
app.MapHub<CampaignHub>("/hubs/campaign");

app.Run();
