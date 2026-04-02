using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using CastLibrary.WebHost.Filters;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.IoC;
using CastLibrary.WebHost.Middleware;

var builder = WebApplication.CreateBuilder(args);

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

app.UseCors("Angular");

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
