using System.Text;
using System.Threading.RateLimiting;
using CastLibrary.WebHost.Validators;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using CastLibrary.WebHost.Authorization;
using CastLibrary.WebHost.Filters;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.IoC;
using CastLibrary.WebHost.Middleware;
using Microsoft.AspNetCore.Authentication;
using CastLibrary.WebHost.Authentication;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Suppress DataProtection and Hosting warnings
builder.Logging.AddFilter("Microsoft.AspNetCore.DataProtection.Repositories.FileSystemXmlRepository", LogLevel.Error);
builder.Logging.AddFilter("Microsoft.AspNetCore.DataProtection.KeyManagement.XmlKeyManager", LogLevel.Error);
builder.Logging.AddFilter("Microsoft.AspNetCore.Hosting.Diagnostics", LogLevel.Error);

var logger = LoggerFactory.Create(config => config.AddConsole()).CreateLogger<Program>();

// DO App Platform injects secrets as plain env vars; ${VAR} interpolation in app.yaml
// doesn't resolve reliably, so read all secrets directly and inject into the config
// hierarchy so all downstream code works unchanged.
var dbConnectionString = string.Empty;

#if(DEBUG)
dbConnectionString = builder.Configuration["ConnectionStrings:DefaultConnection"];
#else
dbConnectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING");
if (dbConnectionString != null)
{
    builder.Configuration["ConnectionStrings:DefaultConnection"] = dbConnectionString;
    logger.LogInformation("DB_CONNECTION_STRING environment variable loaded");
}
else
{
    logger.LogWarning("DB_CONNECTION_STRING environment variable not found");
}
#endif


var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_BASE_URL");
if (frontendUrl != null)
{
    builder.Configuration["AllowedOrigins"] = frontendUrl;
    builder.Configuration["Email:FrontendBaseUrl"] = frontendUrl;
    logger.LogInformation("FRONTEND_BASE_URL environment variable loaded: {FrontendUrl}", frontendUrl);
}
else
{
    logger.LogWarning("FRONTEND_BASE_URL environment variable not found");
}

var jwtKeyEnv = Environment.GetEnvironmentVariable("JWT_KEY");
if (jwtKeyEnv != null)
{
    builder.Configuration["Jwt:Key"] = jwtKeyEnv;
    logger.LogInformation("JWT_KEY environment variable loaded");
}
else
{
    logger.LogWarning("JWT_KEY environment variable not found");
}

// Spaces / S3 config — injected directly to avoid ${VAR} interpolation issues
var spacesAccessKey = Environment.GetEnvironmentVariable("SPACES_ACCESS_KEY");
if (spacesAccessKey != null)
{
    builder.Configuration["ImageStorage:S3:AccessKey"] = spacesAccessKey;
    logger.LogInformation("SPACES_ACCESS_KEY environment variable loaded");
}

var spacesSecretKey = Environment.GetEnvironmentVariable("SPACES_SECRET_KEY");
if (spacesSecretKey != null)
{
    builder.Configuration["ImageStorage:S3:SecretKey"] = spacesSecretKey;
    logger.LogInformation("SPACES_SECRET_KEY environment variable loaded");
}

var spacesBucketName = Environment.GetEnvironmentVariable("SPACES_BUCKET_NAME");
if (spacesBucketName != null)
{
    builder.Configuration["ImageStorage:S3:BucketName"] = spacesBucketName;
    logger.LogInformation("SPACES_BUCKET_NAME environment variable loaded: {BucketName}", spacesBucketName);
}
else
{
    logger.LogWarning("SPACES_BUCKET_NAME environment variable not found");
}

var spacesRegion = Environment.GetEnvironmentVariable("SPACES_REGION");
if (spacesRegion != null)
{
    builder.Configuration["ImageStorage:S3:Region"] = spacesRegion;
    logger.LogInformation("SPACES_REGION environment variable loaded: {Region}", spacesRegion);
}

var spacesEndpoint = Environment.GetEnvironmentVariable("SPACES_ENDPOINT");
if (spacesEndpoint != null)
{
    builder.Configuration["ImageStorage:S3:Endpoint"] = spacesEndpoint;
    logger.LogInformation("SPACES_ENDPOINT environment variable loaded: {Endpoint}", spacesEndpoint);
}

var spacesPublicUrl = Environment.GetEnvironmentVariable("SPACES_PUBLIC_URL");
if (spacesPublicUrl != null)
{
    builder.Configuration["ImageStorage:S3:PublicUrl"] = spacesPublicUrl;
    logger.LogInformation("SPACES_PUBLIC_URL environment variable loaded: {PublicUrl}", spacesPublicUrl);
}

// ── Validate environment variables ─────────────────────────────────────────────
#if !DEBUG
EnvironmentVariableValidator.Validate(logger);
#endif

builder.Services.AddControllers(options =>
{
    options.Filters.Add<RequestLoggingAndExceptionFilter>();
})
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddSignalR(options =>
{
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
})
.AddHubOptions<CampaignHub>(options =>
{

#if (DEBUG)
    options.EnableDetailedErrors = true;
#endif

});

// Configure CORS - support both localhost for development and environment-based URLs
var allowedOrigins = builder.Configuration["AllowedOrigins"]?.Split(";", StringSplitOptions.RemoveEmptyEntries)
    ?? new[] { "http://localhost:4200", "http://localhost:5048" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("Angular", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(opts =>
    {
        opts.IncludeErrorDetails = false;
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

        // Allow JWT from SignalR query string and skip auth for webhook endpoint
        opts.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var path = context.HttpContext.Request.Path;
                
                // Skip JWT validation for webhook endpoint entirely
                if (path.StartsWithSegments("/api/stripe/webhook"))
                {
                    context.NoResult();
                    return Task.CompletedTask;
                }
                
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    context.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("TokenVersionValid", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.AddRequirements(new TokenVersionRequirement());
    });
});

builder.Services.AddScoped<IAuthorizationHandler, TokenVersionAuthorizationHandler>();

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
app.UseWebSockets();
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
        !path.StartsWithSegments("/health") &&
        !path.StartsWithSegments("/images"))
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
app.UseMiddleware<SubscriptionLockMiddleware>();
app.UseAuthorization();
app.MapControllers();

app.MapHealthChecks("/health");      // DO internal probe hits container directly
app.MapHealthChecks("/api/health");  // public path after preserve_path_prefix
app.MapHub<CampaignHub>("/hubs/campaign");

app.Run();
