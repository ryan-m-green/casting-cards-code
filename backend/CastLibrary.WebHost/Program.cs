using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using CastLibrary.WebHost.Filters;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.IoC;
using CastLibrary.WebHost.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// DO App Platform injects secrets as plain env vars; ${VAR} interpolation in app.yaml
// doesn't resolve reliably, so read all secrets directly and inject into the config
// hierarchy so all downstream code works unchanged.
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

// Spaces / S3 config — injected directly to avoid ${VAR} interpolation issues
var spacesAccessKey = Environment.GetEnvironmentVariable("SPACES_ACCESS_KEY");
if (spacesAccessKey != null)
    builder.Configuration["ImageStorage:S3:AccessKey"] = spacesAccessKey;

var spacesSecretKey = Environment.GetEnvironmentVariable("SPACES_SECRET_KEY");
if (spacesSecretKey != null)
    builder.Configuration["ImageStorage:S3:SecretKey"] = spacesSecretKey;

var spacesBucketName = Environment.GetEnvironmentVariable("SPACES_BUCKET_NAME");
if (spacesBucketName != null)
    builder.Configuration["ImageStorage:S3:BucketName"] = spacesBucketName;

var spacesRegion = Environment.GetEnvironmentVariable("SPACES_REGION");
if (spacesRegion != null)
    builder.Configuration["ImageStorage:S3:Region"] = spacesRegion;

var spacesEndpoint = Environment.GetEnvironmentVariable("SPACES_ENDPOINT");
if (spacesEndpoint != null)
    builder.Configuration["ImageStorage:S3:Endpoint"] = spacesEndpoint;

var spacesPublicUrl = Environment.GetEnvironmentVariable("SPACES_PUBLIC_URL");
if (spacesPublicUrl != null)
    builder.Configuration["ImageStorage:S3:PublicUrl"] = spacesPublicUrl;

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

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("AuthEndpoints", limiterOptions =>
    {
        limiterOptions.PermitLimit = 10;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 0;
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

builder.Services.AddCastLibraryServices(builder.Configuration);

var app = builder.Build();

app.UseCors("Angular");
app.UseRateLimiter();

// ── Path prefix restore ───────────────────────────────────────────────────────
// DO App Platform strips the matched ingress prefix (/api, /hubs, /images)
// before forwarding to the container. All controllers are routed under api/,
// so re-add the prefix when it is missing.
app.Use(async (context, next) =>
{
    var path = context.Request.Path;
    if (!path.StartsWithSegments("/api") &&
        !path.StartsWithSegments("/hubs") &&
        !path.StartsWithSegments("/health"))
    {
        context.Request.Path = "/api" + path;
    }
    await next();
});

// ── Routing ───────────────────────────────────────────────────────────────────
// Must be called EXPLICITLY here, AFTER path prefix restore.
// If omitted, ASP.NET Core places UseRouting() at the very start of the pipeline
// (before path restoration), so the router sees /auth/login instead of
// /api/auth/login and every controller route returns 404.
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
app.MapControllers();
app.MapHealthChecks("/health");      // DO internal probe hits container directly
app.MapHealthChecks("/api/health");  // public path after preserve_path_prefix
app.MapHub<CampaignHub>("/hubs/campaign");

app.Run();
