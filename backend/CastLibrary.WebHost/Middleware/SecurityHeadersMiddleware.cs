using Microsoft.Extensions.Hosting;

namespace CastLibrary.WebHost.Middleware;

/// <summary>
/// ASP.NET Core middleware that adds security headers to HTTP responses.
///
/// Responsibilities:
///   1. Add X-Frame-Options: DENY to prevent clickjacking
///   2. Add X-Content-Type-Options: nosniff to prevent MIME-type sniffing
///   3. Add X-XSS-Protection: "1; mode=block" for legacy XSS protection
///   4. Add Referrer-Policy: strict-origin-when-cross-origin for privacy
///   5. Add Permissions-Policy with restrictive settings
///   6. Add Content Security Policy for production environments
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        // Add security headers to response
        AddSecurityHeaders(context.Response, context.Request);

        await next(context);
    }

    private static void AddSecurityHeaders(HttpResponse response, HttpRequest request)
    {
        // Prevent clickjacking
        if (!response.Headers.ContainsKey("X-Frame-Options"))
        {
            response.Headers["X-Frame-Options"] = "DENY";
        }

        // Prevent MIME-type sniffing
        if (!response.Headers.ContainsKey("X-Content-Type-Options"))
        {
            response.Headers["X-Content-Type-Options"] = "nosniff";
        }

        // Legacy XSS protection (for older browsers)
        if (!response.Headers.ContainsKey("X-XSS-Protection"))
        {
            response.Headers["X-XSS-Protection"] = "1; mode=block";
        }

        // Control referrer information for privacy
        if (!response.Headers.ContainsKey("Referrer-Policy"))
        {
            response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        }

        // Restrict browser features and APIs
        if (!response.Headers.ContainsKey("Permissions-Policy"))
        {
            response.Headers["Permissions-Policy"] = 
                "camera=(), " +
                "microphone=(), " +
                "geolocation=(), " +
                "payment=(), " +
                "usb=(), " +
                "magnetometer=(), " +
                "gyroscope=(), " +
                "accelerometer=()";
        }

        // Content Security Policy - secure policy for production
        if (!response.Headers.ContainsKey("Content-Security-Policy"))
        {
            // Secure CSP that prevents XSS while allowing required external resources
            var hostingEnvironment = request.HttpContext.RequestServices
                .GetService<IWebHostEnvironment>();
            var isDevelopment = hostingEnvironment != null && hostingEnvironment.IsDevelopment();
            
            string csp;
            if (isDevelopment)
            {
                // Development CSP with relaxed rules for debugging
                csp = "default-src 'self'; " +
                      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; " +
                      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                      "font-src 'self' https://fonts.gstatic.com; " +
                      "img-src 'self' data: https: https://*.stripe.com https://fonts.gstatic.com; " +
                      "connect-src 'self' https://api.stripe.com ws: wss:; " +
                      "frame-src 'self' https://js.stripe.com; " +
                      "object-src 'none'; " +
                      "base-uri 'self'; " +
                      "form-action 'self'; " +
                      "frame-ancestors 'none'; " +
                      "upgrade-insecure-requests";
            }
            else
            {
                // Production CSP with strict security rules
                csp = "default-src 'self'; " +
                      "script-src 'self' https://js.stripe.com; " +
                      "style-src 'self' https://fonts.googleapis.com; " +
                      "font-src 'self' https://fonts.gstatic.com; " +
                      "img-src 'self' data: https://*.stripe.com https://fonts.gstatic.com; " +
                      "connect-src 'self' https://api.stripe.com; " +
                      "frame-src 'self' https://js.stripe.com; " +
                      "object-src 'none'; " +
                      "base-uri 'self'; " +
                      "form-action 'self'; " +
                      "frame-ancestors 'none'; " +
                      "upgrade-insecure-requests; " +
                      "manifest-src 'self'";
            }

            response.Headers["Content-Security-Policy"] = csp;
        }

        // Additional security headers
        if (!response.Headers.ContainsKey("Strict-Transport-Security"))
        {
            // Only add HSTS in production and over HTTPS
            if (request.IsHttps)
            {
                var hostingEnvironment = request.HttpContext.RequestServices
                    .GetService<IWebHostEnvironment>();
                var isDevelopment = hostingEnvironment != null && hostingEnvironment.IsDevelopment();
                
                if (!isDevelopment)
                {
                    // Production HSTS with reasonable settings (no preload)
                    response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
                }
                else
                {
                    // Development HSTS with short duration
                    response.Headers["Strict-Transport-Security"] = "max-age=300";
                }
            }
        }
    }
}
