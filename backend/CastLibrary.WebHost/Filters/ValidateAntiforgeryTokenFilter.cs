using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using CastLibrary.Shared.Interfaces;
using CastLibrary.Shared.Enums;
using CastLibrary.WebHost.MetadataHelpers;

namespace CastLibrary.WebHost.Filters;

/// <summary>
/// Attribute to validate antiforgery tokens for API endpoints.
/// Apply this to all POST, PUT, DELETE, PATCH endpoints that modify state.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public class ValidateAntiforgeryTokenFilter : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var logger = context.HttpContext.RequestServices.GetService<ILogger<ValidateAntiforgeryTokenFilter>>();
        var antiforgery = context.HttpContext.RequestServices.GetRequiredService<IAntiforgery>();
        
        // Skip validation for GET, HEAD, OPTIONS, TRACE requests
        var method = context.HttpContext.Request.Method;
        if (method.Equals("GET", StringComparison.OrdinalIgnoreCase) ||
            method.Equals("HEAD", StringComparison.OrdinalIgnoreCase) ||
            method.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase) ||
            method.Equals("TRACE", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        // Skip validation for webhook endpoints (they have their own security)
        var path = context.HttpContext.Request.Path;
        if (path.StartsWithSegments("/api/stripe/webhook"))
        {
            return;
        }

        // Skip validation for authentication endpoints (they handle their own security)
        if (path.StartsWithSegments("/api/auth/login") ||
            path.StartsWithSegments("/api/auth/register") ||
            path.StartsWithSegments("/api/auth/forgot-password") ||
            path.StartsWithSegments("/api/auth/reset-password") ||
            path.StartsWithSegments("/api/auth/verify-email") ||
            path.StartsWithSegments("/api/auth/change-password") ||
            path.StartsWithSegments("/api/auth/update-display-name") ||
            path.StartsWithSegments("/api/auth/update-email"))
        {
            return;
        }

        // Log request details for debugging
        logger?.LogInformation("Antiforgery validation for {Method} {Path}", method, path);
        var xsrfHeader = context.HttpContext.Request.Headers["X-XSRF-TOKEN"].FirstOrDefault();
        var xsrfCookie = context.HttpContext.Request.Cookies["XSRF-TOKEN"];
        logger?.LogInformation("Antiforgery tokens - Header: {Header}, Cookie: {Cookie}", 
            xsrfHeader ?? "NULL", xsrfCookie ?? "NULL");

        try
        {
            await antiforgery.ValidateRequestAsync(context.HttpContext);
            logger?.LogInformation("Antiforgery validation successful for {Method} {Path}", method, path);
        }
        catch (AntiforgeryValidationException ex)
        {
            logger?.LogError(ex, "Antiforgery validation failed for {Method} {Path} - Header: {Header}, Cookie: {Cookie}", 
                method, path, xsrfHeader ?? "NULL", xsrfCookie ?? "NULL");
            // Log CSRF validation failure for security auditing
            var auditService = context.HttpContext.RequestServices.GetService<IAuditLoggingService>();
            if (auditService != null)
            {
                var userRetriever = context.HttpContext.RequestServices.GetService<IUserRetriever>();
                var userId = userRetriever?.GetUserId(context.HttpContext.User) ?? Guid.Empty;
                var userEmail = userRetriever?.GetEmail(context.HttpContext.User) ?? "Unknown";
                var clientIp = GetClientIpAddress(context.HttpContext);
                var userAgent = context.HttpContext.Request.Headers["User-Agent"].ToString();
                
                auditService.LogSecurityEventAsync(
                    userId,
                    userEmail,
                    AuditEventType.SuspiciousActivity,
                    "CSRF token validation failed",
                    clientIp,
                    userAgent,
                    additionalData: $"Path: {context.HttpContext.Request.Path}, Method: {context.HttpContext.Request.Method}").Wait();
            }

            context.Result = new BadRequestObjectResult(new { 
                error = "Invalid antiforgery token",
                message = "CSRF token validation failed"
            });
        }
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
