using System.Net;
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
using Microsoft.AspNetCore.Authentication.Cookies;
using CastLibrary.WebHost.Authentication;
using CastLibrary.Shared.Enums;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using CastLibrary.Shared.Interfaces;
using Serilog;
using Serilog.Events;

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .WriteTo.File("C:\\Repository\\CastingCards\\logs\\cast-library-.txt", rollingInterval: RollingInterval.Day)
    .WriteTo.File("C:\\Repository\\CastingCards\\logs\\errors\\cast-library-error-.txt", rollingInterval: RollingInterval.Day, restrictedToMinimumLevel: Serilog.Events.LogEventLevel.Error)
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

// Use Serilog
builder.Host.UseSerilog();

builder.Logging.ClearProviders();

// Suppress DataProtection and Hosting warnings
builder.Logging.AddFilter("Microsoft.AspNetCore.DataProtection.Repositories.FileSystemXmlRepository", LogLevel.Error);
builder.Logging.AddFilter("Microsoft.AspNetCore.DataProtection.KeyManagement.XmlKeyManager", LogLevel.Error);
builder.Logging.AddFilter("Microsoft.AspNetCore.Hosting.Diagnostics", LogLevel.Error);

var logger = builder.Services.BuildServiceProvider().GetRequiredService<ILogger<Program>>();

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


#if !DEBUG
var frontendUrl = Environment.GetEnvironmentVariable("Email__FrontendBaseUrl");
if (frontendUrl != null)
{
    builder.Configuration["AllowedOrigins"] = frontendUrl;
    builder.Configuration["Email:FrontendBaseUrl"] = frontendUrl;
    logger.LogInformation("Email__FrontendBaseUrl environment variable loaded: {FrontendUrl}", frontendUrl);
}
else
{
    logger.LogWarning("Email__FrontendBaseUrl environment variable not found");
}
#endif

#if !DEBUG
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
#endif

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
    options.Filters.Add<ValidateAntiforgeryTokenFilter>();
    options.Filters.Add<ModelStateValidationFilter>();
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

var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

// Validate and get cookie domain
var cookieDomain = Environment.GetEnvironmentVariable("COOKIE_DOMAIN");
if (!string.IsNullOrEmpty(cookieDomain) && !IsValidDomain(cookieDomain))
{
    throw new InvalidOperationException($"Invalid COOKIE_DOMAIN format: '{cookieDomain}'. Domain must be in valid format (e.g., 'example.com' or '.example.com').");
}

static bool IsValidDomain(string domain)
{
    if (string.IsNullOrWhiteSpace(domain))
        return false;
    
    // Basic domain validation - can be enhanced as needed
    return Uri.CheckHostName(domain) != UriHostNameType.Unknown;
}

if (string.IsNullOrEmpty(jwtKey))
{
    throw new InvalidOperationException("JWT Key is required. Please set the Jwt:Key configuration value.");
}

if (string.IsNullOrEmpty(jwtIssuer))
{
    throw new InvalidOperationException("JWT Issuer is required. Please set the Jwt:Issuer configuration value.");
}

if (string.IsNullOrEmpty(jwtAudience))
{
    throw new InvalidOperationException("JWT Audience is required. Please set the Jwt:Audience configuration value.");
}
builder.Services.AddAuthentication(options =>
    {
        // For API endpoints, use JWT as default
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddCookie("Cookies", opts =>
    {
        opts.Cookie.Name = "casting_cards_token";
        opts.Cookie.HttpOnly = true;
        opts.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.None : CookieSecurePolicy.Always;
        opts.Cookie.SameSite = SameSiteMode.Lax;
        opts.Cookie.Path = "/";
        if (!string.IsNullOrEmpty(cookieDomain))
        {
            opts.Cookie.Domain = cookieDomain;
        }
        opts.ExpireTimeSpan = TimeSpan.FromHours(4);
        opts.SlidingExpiration = true;
        opts.Events = new CookieAuthenticationEvents
        {
            OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            },
            OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            }
        };
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
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        };

        // Configure JWT to read from cookies for SignalR and skip webhook
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
                
                // For SignalR, try to get JWT from query parameter first, then cookie
                if (path.StartsWithSegments("/hubs"))
                {
                    // Try query parameter first (access_token)
                    var accessToken = context.HttpContext.Request.Query["access_token"].FirstOrDefault();
                    if (!string.IsNullOrEmpty(accessToken))
                    {
                        context.Token = accessToken;
                        return Task.CompletedTask;
                    }
                    
                    // Fallback to cookie
                    var token = context.HttpContext.Request.Cookies["casting_cards_token"];
                    if (!string.IsNullOrEmpty(token))
                    {
                        context.Token = token;
                        return Task.CompletedTask;
                    }
                }
                
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

// Add Antiforgery services for CSRF protection
builder.Services.AddAntiforgery(options =>
{
    options.Cookie.Name = "XSRF-TOKEN";
    options.Cookie.HttpOnly = false;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.None : CookieSecurePolicy.SameAsRequest;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.Path = "/";
    if (!string.IsNullOrEmpty(cookieDomain))
    {
        options.Cookie.Domain = cookieDomain;
    }
    // Remove domain restriction for localhost development
    options.HeaderName = "X-XSRF-TOKEN";
    options.FormFieldName = "XSRF-TOKEN";
    options.Cookie.Expiration = TimeSpan.FromHours(4);
    options.Cookie.MaxAge = TimeSpan.FromHours(4);
    // Allow header-only token validation for API calls
    options.SuppressXFrameOptionsHeader = false;
});

// Log antiforgery configuration for debugging
logger.LogInformation("Antiforgery Configuration - Cookie Name: XSRF-TOKEN, Secure: {SecurePolicy}, SameSite: {SameSite}, Path: /, Domain: {Domain}",
    builder.Environment.IsDevelopment() ? "None" : "Always",
    SameSiteMode.Lax,
    cookieDomain ?? "(none)");

// Rate limiting for security
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            GetClientId(context),
            key => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = GetPermitLimit(context),
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6
            }));

    options.OnRejected = async (context, cancellationToken) =>
    {
        var logger = context.HttpContext.RequestServices.GetService<ILogger<Program>>();

        var clientId = GetClientId(context.HttpContext);
        var endpoint = context.HttpContext.Request.Path;
        var httpMethod = context.HttpContext.Request.Method;

        // Extract user information if available
        var userId = GetUserId(context.HttpContext);
        var userEmail = GetUserEmail(context.HttpContext);

        // Try to log to audit service if available
        try
        {
            var auditService = context.HttpContext.RequestServices.GetService<IAuditLoggingService>();
            if (auditService != null)
            {
                await auditService.LogSecurityEventAsync(
                    userId,
                    userEmail,
                    AuditEventType.RateLimitViolation,
                    $"Rate limit exceeded for {httpMethod} {endpoint}",
                    GetClientIpAddress(context.HttpContext),
                    context.HttpContext.Request.Headers["User-Agent"].ToString(),
                    additionalData: $"ClientId: {clientId}, Endpoint: {endpoint}, Method: {httpMethod}");
            }
        }
        catch (Exception ex)
        {
            logger?.LogWarning(ex, "Failed to log rate limit violation to audit service");
        }

        logger?.LogWarning(
            "Rate limit exceeded for client {ClientId} on {Method} {Endpoint} by user {UserId} ({UserEmail})",
            clientId, httpMethod, endpoint, userId, userEmail);

        // Set the response
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsync("Too many requests. Please try again later.");
    };

    // Add specific policy for authentication endpoints
    options.AddPolicy("AuthEndpoints", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            GetClientId(context),
            key => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 20, // 20 requests per minute for auth endpoints
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6
            }));
});

builder.Services.AddCastLibraryServices(builder.Configuration);

var app = builder.Build();

// Configure forwarded headers for Digital Ocean App Platform
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
    KnownProxies = { IPAddress.None }, // Trust all proxies (DO App Platform environment)
    ForwardLimit = null
});

app.UseCors("Angular");
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<ModelBindingErrorMiddleware>();
app.UseWebSockets();

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

// ── Rate Limiting ─────────────────────────────────────────────────────────────
// CRITICAL: Must be after UseRouting to ensure rate limiting applies to final paths
// not the pre-path-restore paths, preventing bypass vulnerabilities
// DISABLED: app.UseRateLimiter();

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

// ── Audit Logging ─────────────────────────────────────────────────────────────
// Must run after UseAuthentication to have user context for audit events
// Temporarily commented out to test security headers
// app.UseMiddleware<AuditLoggingMiddleware>();
app.UseAuthorization();
app.MapControllers();

app.MapHealthChecks("/health");      // DO internal probe hits container directly
app.MapHealthChecks("/api/health");  // public path after preserve_path_prefix
app.MapHub<CampaignHub>("/hubs/campaign");

app.Run();

// Helper methods for rate limiting
static string GetClientId(HttpContext context)
{
    // Try to get authenticated user ID first
    var userIdClaim = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    if (!string.IsNullOrEmpty(userIdClaim))
    {
        return $"user:{userIdClaim}";
    }

    // Fall back to IP address
    var ipAddress = GetClientIpAddress(context);
    return $"ip:{ipAddress}";
}

static Guid GetUserId(HttpContext context)
{
    var userIdClaim = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
}

static string GetUserEmail(HttpContext context)
{
    return context.User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "Anonymous";
}

static string GetClientIpAddress(HttpContext context)
{
    var xForwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
    if (!string.IsNullOrEmpty(xForwardedFor))
    {
        return xForwardedFor.Split(',')[0].Trim();
    }

    var xRealIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
    if (!string.IsNullOrEmpty(xRealIp))
    {
        return xRealIp;
    }

    return context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
}

static int GetPermitLimit(HttpContext context)
{
    var path = context.Request.Path.Value?.ToLower() ?? string.Empty;
    
    if (path.Contains("/auth/") || path.Contains("/login") || path.Contains("/register"))
    {
        return 20; // AuthEndpoints limit
    }
    
    if (path.Contains("/subscription"))
    {
        return 5; // SubscriptionRefresh limit
    }
    
    return 100; // GeneralApi limit
}
