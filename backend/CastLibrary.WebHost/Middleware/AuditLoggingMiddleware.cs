using System;
using System.Diagnostics;
using System.IO;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using CastLibrary.Shared.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace CastLibrary.WebHost.Middleware;

public class AuditLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditLoggingMiddleware> _logger;
    private readonly IAuditLoggingService _auditService;

    public AuditLoggingMiddleware(
        RequestDelegate next,
        ILogger<AuditLoggingMiddleware> logger,
        IAuditLoggingService auditService)
    {
        _next = next;
        _logger = logger;
        _auditService = auditService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var originalResponseBody = context.Response.Body;
        
        try
        {
            // Only log API requests
            if (ShouldLogRequest(context))
            {
                using var responseBodyStream = new MemoryStream();
                context.Response.Body = responseBodyStream;

                var requestDetails = await CaptureRequestDetailsAsync(context);
                
                await _next(context);

                stopwatch.Stop();
                var responseDetails = await CaptureResponseDetailsAsync(context, responseBodyStream);
                
                await LogRequestAsync(context, requestDetails, responseDetails, stopwatch.ElapsedMilliseconds);
                
                // Copy response back to original stream
                responseBodyStream.Seek(0, SeekOrigin.Begin);
                await responseBodyStream.CopyToAsync(originalResponseBody);
            }
            else
            {
                await _next(context);
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Error in audit logging middleware");
            
            if (ShouldLogRequest(context))
            {
                await LogErrorAsync(context, ex, stopwatch.ElapsedMilliseconds);
            }
            
            context.Response.Body = originalResponseBody;
            throw;
        }
        finally
        {
            context.Response.Body = originalResponseBody;
        }
    }

    private bool ShouldLogRequest(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLower() ?? string.Empty;
        
        // Skip static files, health checks, and SignalR
        if (path.StartsWith("/static/") || 
            path.StartsWith("/css/") || 
            path.StartsWith("/js/") || 
            path.StartsWith("/images/") ||
            path.Contains("health") ||
            path.StartsWith("/hub"))
        {
            return false;
        }

        // Log API endpoints and authentication endpoints
        return path.StartsWith("/api/") || 
               path.StartsWith("/auth/") ||
               path.StartsWith("/login") ||
               path.StartsWith("/register");
    }

    private async Task<string> CaptureRequestDetailsAsync(HttpContext context)
    {
        try
        {
            var details = new
            {
                Path = context.Request.Path,
                QueryString = context.Request.QueryString.ToString(),
                Headers = context.Request.Headers.ToDictionary(h => h.Key, h => h.Value.ToString()),
                ContentType = context.Request.ContentType
            };

            // Only capture body for specific endpoints and if it's not too large
            if (ShouldCaptureBody(context.Request) && context.Request.ContentLength < 1024 * 1024) // 1MB limit
            {
                context.Request.EnableBuffering();
                context.Request.Body.Position = 0;
                
                using var reader = new StreamReader(context.Request.Body, leaveOpen: true);
                var body = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0;

                return JsonSerializer.Serialize(new { details, Body = body });
            }

            return JsonSerializer.Serialize(details);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to capture request details");
            return "{}";
        }
    }

    private async Task<string> CaptureResponseDetailsAsync(HttpContext context, MemoryStream responseBodyStream)
    {
        try
        {
            responseBodyStream.Seek(0, SeekOrigin.Begin);
            using var reader = new StreamReader(responseBodyStream, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            responseBodyStream.Seek(0, SeekOrigin.Begin);

            var details = new
            {
                StatusCode = context.Response.StatusCode,
                Headers = context.Response.Headers.ToDictionary(h => h.Key, h => h.Value.ToString()),
                ContentType = context.Response.ContentType
            };

            // Only capture response body for specific content types and if it's not too large
            if (ShouldCaptureResponseBody(context.Response) && body.Length < 1024 * 1024) // 1MB limit
            {
                return JsonSerializer.Serialize(new { details, Body = body });
            }

            return JsonSerializer.Serialize(details);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to capture response details");
            return "{}";
        }
    }

    private bool ShouldCaptureBody(HttpRequest request)
    {
        var path = request.Path.Value?.ToLower() ?? string.Empty;
        var method = request.Method.ToUpperInvariant();

        // Capture body for authentication and subscription endpoints
        return (path.Contains("/auth/") || path.Contains("/login") || path.Contains("/register") || 
                path.Contains("/subscription")) && 
               (method == "POST" || method == "PUT" || method == "PATCH");
    }

    private bool ShouldCaptureResponseBody(HttpResponse response)
    {
        var contentType = response.ContentType?.ToLower() ?? string.Empty;
        
        // Only capture JSON responses
        return contentType.Contains("application/json");
    }

    private async Task LogRequestAsync(HttpContext context, string requestDetails, string responseDetails, long elapsedMs)
    {
        try
        {
            var userId = GetUserId(context);
            var userEmail = GetUserEmail(context);
            var eventType = GetEventType(context);
            var eventDescription = GetEventDescription(context, context.Response.StatusCode);

            await _auditService.LogEventAsync(
                userId,
                userEmail,
                eventType,
                eventDescription,
                endpoint: context.Request.Path,
                httpMethod: context.Request.Method,
                statusCode: context.Response.StatusCode,
                ipAddress: GetClientIpAddress(context),
                userAgent: context.Request.Headers["User-Agent"].ToString(),
                requestDetails: requestDetails,
                responseDetails: responseDetails,
                isSuccess: context.Response.StatusCode < 400,
                errorMessage: context.Response.StatusCode >= 400 ? $"HTTP {context.Response.StatusCode}" : null,
                additionalData: $"ElapsedMs: {elapsedMs}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log audit event");
        }
    }

    private async Task LogErrorAsync(HttpContext context, Exception ex, long elapsedMs)
    {
        try
        {
            var userId = GetUserId(context);
            var userEmail = GetUserEmail(context);

            await _auditService.LogEventAsync(
                userId,
                userEmail,
                Shared.Enums.AuditEventType.ApiError,
                $"Request failed: {ex.Message}",
                endpoint: context.Request.Path,
                httpMethod: context.Request.Method,
                statusCode: 500,
                ipAddress: GetClientIpAddress(context),
                userAgent: context.Request.Headers["User-Agent"].ToString(),
                isSuccess: false,
                errorMessage: ex.ToString(),
                additionalData: $"ElapsedMs: {elapsedMs}");
        }
        catch (Exception logEx)
        {
            _logger.LogError(logEx, "Failed to log error audit event");
        }
    }

    private Guid GetUserId(HttpContext context)
    {
        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private string GetUserEmail(HttpContext context)
    {
        return context.User.FindFirst(ClaimTypes.Email)?.Value ?? "Anonymous";
    }

    private static Shared.Enums.AuditEventType GetEventType(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLower() ?? string.Empty;
        var method = context.Request.Method.ToUpperInvariant();

        if (path.Contains("/auth/") || path.Contains("/login") || path.Contains("/register"))
        {
            return method == "POST" ? Shared.Enums.AuditEventType.LoginSuccess : Shared.Enums.AuditEventType.Logout;
        }

        if (path.Contains("/subscription"))
        {
            return Shared.Enums.AuditEventType.SubscriptionRefresh;
        }

        if (path.Contains("/permissions") || path.Contains("/roles"))
        {
            return method switch
            {
                "POST" => Shared.Enums.AuditEventType.RoleAssigned,
                "DELETE" => Shared.Enums.AuditEventType.RoleRemoved,
                _ => Shared.Enums.AuditEventType.PermissionGranted
            };
        }

        if (path.Contains("/campaigns"))
        {
            return method switch
            {
                "POST" => Shared.Enums.AuditEventType.CampaignCreated,
                "PUT" => Shared.Enums.AuditEventType.CampaignUpdated,
                "DELETE" => Shared.Enums.AuditEventType.CampaignDeleted,
                _ => Shared.Enums.AuditEventType.ApiAccess
            };
        }

        return Shared.Enums.AuditEventType.ApiAccess;
    }

    private static string GetEventDescription(HttpContext context, int statusCode)
    {
        var path = context.Request.Path.Value?.ToLower() ?? string.Empty;
        var method = context.Request.Method.ToUpperInvariant();

        if (path.Contains("/auth/") || path.Contains("/login"))
        {
            return statusCode >= 400 ? "Login attempt failed" : "Login successful";
        }

        if (path.Contains("/register"))
        {
            return statusCode >= 400 ? "User registration failed" : "User registration successful";
        }

        if (path.Contains("/subscription"))
        {
            return "Subscription operation";
        }

        return $"{method} {context.Request.Path} - {statusCode}";
    }

    private static string GetClientIpAddress(HttpContext context)
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
}
