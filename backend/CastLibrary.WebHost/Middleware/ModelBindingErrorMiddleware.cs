using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace CastLibrary.WebHost.Middleware;

public class ModelBindingErrorMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ModelBindingErrorMiddleware> _logger;

    public ModelBindingErrorMiddleware(RequestDelegate next, ILogger<ModelBindingErrorMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var originalBodyStream = context.Response.Body;
        using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            // Check if this is a model binding exception
            if (context.Request.Path.StartsWithSegments("/api/cast") && context.Request.Method == "POST")
            {
                _logger.LogError(ex, "POST /api/cast - Model binding or deserialization error");
                
                // Try to read the request body for logging
                context.Request.EnableBuffering();
                context.Request.Body.Position = 0;
                using var reader = new StreamReader(context.Request.Body);
                var requestBody = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0;
                
                _logger.LogError("POST /api/cast - Request body that failed: {RequestBody}", requestBody);
                _logger.LogError("POST /api/cast - Content-Type: {ContentType}", context.Request.ContentType);
                _logger.LogError("POST /api/cast - Content-Length: {ContentLength}", context.Request.ContentLength);
            }
            
            throw;
        }
        finally
        {
            responseBody.Seek(0, SeekOrigin.Begin);
            await responseBody.CopyToAsync(originalBodyStream);
        }
    }
}

public static class ModelBindingErrorMiddlewareExtensions
{
    public static IApplicationBuilder UseModelBindingErrorMiddleware(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ModelBindingErrorMiddleware>();
    }
}
