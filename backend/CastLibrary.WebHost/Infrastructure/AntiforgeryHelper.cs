using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;

namespace CastLibrary.WebHost.Infrastructure;

public static class AntiforgeryHelper
{
    /// <summary>
    /// Manually sets the XSRF-TOKEN cookie with consistent options across all endpoints.
    /// This is used as a fallback when GetAndStoreTokens doesn't reliably set the cookie.
    /// </summary>
    public static void SetXsrfCookie(
        HttpResponse response,
        string cookieToken,
        bool isSecure,
        ILogger? logger = null)
    {
        if (string.IsNullOrEmpty(cookieToken))
        {
            logger?.LogWarning("AntiforgeryHelper: Cannot set XSRF cookie - cookieToken is null or empty");
            return;
        }

        var cookieOptions = new CookieOptions
        {
            HttpOnly = false,
            Secure = isSecure,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = DateTime.UtcNow.AddHours(4),
            Domain = GetValidatedCookieDomain() // Use same domain logic as Program.cs
        };

        response.Cookies.Append("XSRF-TOKEN", cookieToken, cookieOptions);
        logger?.LogInformation("AntiforgeryHelper: XSRF-TOKEN cookie set manually with domain: {Domain}", cookieOptions.Domain ?? "(none)");
    }

    /// <summary>
    /// Validates that antiforgery tokens were generated successfully.
    /// </summary>
    public static bool ValidateTokensGenerated(AntiforgeryTokenSet tokens, ILogger? logger = null)
    {
        if (tokens.CookieToken == null)
        {
            logger?.LogError("AntiforgeryHelper: CookieToken is null after GetAndStoreTokens");
            return false;
        }

        if (tokens.RequestToken == null)
        {
            logger?.LogError("AntiforgeryHelper: RequestToken is null after GetAndStoreTokens");
            return false;
        }

        logger?.LogInformation("AntiforgeryHelper: Tokens generated successfully");
        return true;
    }

    /// <summary>
    /// Gets a validated cookie domain from environment variables.
    /// Returns null if the domain is invalid or not set.
    /// </summary>
    public static string? GetValidatedCookieDomain()
    {
        var cookieDomain = Environment.GetEnvironmentVariable("COOKIE_DOMAIN");
        if (string.IsNullOrEmpty(cookieDomain))
            return null;
        
        return Uri.CheckHostName(cookieDomain) != UriHostNameType.Unknown ? cookieDomain : null;
    }
}
