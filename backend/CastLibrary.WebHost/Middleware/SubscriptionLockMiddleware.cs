using System.Security.Claims;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Enums;
using CastLibrary.WebHost.Configuration;
using CastLibrary.WebHost.MetadataHelpers;

namespace CastLibrary.WebHost.Middleware;

/// <summary>
/// Middleware that enforces subscription lock level restrictions on API requests.
/// Runs after authentication middleware and before authorization middleware.
/// Uses LockLevelConfiguration to determine which endpoints are accessible in each lock state.
/// </summary>
public sealed class SubscriptionLockMiddleware(RequestDelegate next)
{
    private readonly RequestDelegate _next = next;

    public async Task InvokeAsync(
        HttpContext context,
        IUserRetriever userRetriever,
        ILoggingService loggingService)
    {
        var path = context.Request.Path;
        
        // Skip lock checks for Stripe webhook endpoint - security handled by StripeWebhookSecurityFilter
        if (path.StartsWithSegments("/api/stripe/webhook"))
        {
            await _next(context);
            return;
        }
        
        var user = context.User;

        // Skip lock checks if user is not authenticated (handled by auth middleware later)
        if (user == null || !user.Identity?.IsAuthenticated == true)
        {
            await _next(context);
            return;
        }

        // Check exemptions: Admin role OR BypassPayment flag OR FreeTrial
        var isAdmin = user.FindFirst(ClaimTypes.Role)?.Value == UserRole.Admin.ToString();
        var bypassPayment = userRetriever.GetBypassPayment(user);
        var isFreeTrial = userRetriever.IsFreeTrial(user);

        if (isAdmin || bypassPayment || isFreeTrial)
        {
            await _next(context);
            return;
        }

        var lockLevel = userRetriever.GetLockLevel(user);      
        var userId = userRetriever.GetUserId(user);
        var method = context.Request.Method;

        // Check if path is allowed for this lock level based on configuration
        if (LockLevelConfiguration.IsPathAllowed(path, lockLevel, method))
        {
            await _next(context);
            return;
        }

        // Path is not allowed - block the request
        await BlockRequest(context, loggingService, userId, lockLevel, method, path, $"Endpoint blocked in {lockLevel} state");
    }

    private static async Task BlockRequest(
        HttpContext context,
        ILoggingService loggingService,
        Guid userId,
        LockLevel lockLevel,
        string method,
        string path,
        string reason)
    {
        // Log the blocked request
        loggingService.LogWarning($"Subscription lock blocked request - UserId: {userId}, LockLevel: {lockLevel}, Method: {method}, Path: {path}, Reason: {reason}, Timestamp: {DateTime.UtcNow}");

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            error = "Subscription locked",
            lockLevel = lockLevel.ToString(),
            message = GetLockLevelMessage(lockLevel)
        });
    }

    private static string GetLockLevelMessage(LockLevel lockLevel)
    {
        return lockLevel switch
        {
            LockLevel.SoftLock => "Your subscription is past due. Editing is temporarily disabled.",
            LockLevel.HardLock => "Your account is locked until payment is updated.",
            LockLevel.Suspended => "Your subscription has been suspended. Update your payment method to restore access.",
            _ => "Access restricted due to subscription status."
        };
    }
}
