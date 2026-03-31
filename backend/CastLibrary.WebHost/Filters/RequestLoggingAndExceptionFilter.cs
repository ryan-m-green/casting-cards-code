using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using CastLibrary.Logic.Interfaces;

namespace CastLibrary.WebHost.Filters;

/// <summary>
/// Combined filter that logs incoming requests, handles exceptions, and logs outgoing responses.
/// Captures correlation context, request metadata, exception details, and response information.
/// </summary>
public class RequestLoggingAndExceptionFilter(
    ILoggingService    loggingService,
    ICorrelationContext correlation) : IAsyncActionFilter, IExceptionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // Get request metadata
        var spanId = correlation.NewSpan();
        var traceId = correlation.TraceId;
        var route = context.ActionDescriptor.AttributeRouteInfo?.Template ?? "UnknownRoute";
        var target = context.HttpContext.Request.Path.Value ?? "UnknownTarget";
        var clientIp = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "UnknownIP";
        var httpMethod = context.HttpContext.Request.Method;
        var body = GetRequestBody(context);

        // Log the incoming request
        loggingService.LogRequest(traceId, spanId, httpMethod, route, target, clientIp, body);

        try
        {
            // Execute the action
            var executedContext = await next();

            // Log the response (only if no exception was thrown)
            if (!executedContext.ExceptionHandled)
            {
                var responseBody = GetResponseBody(executedContext);
                loggingService.LogResponse(traceId, spanId, executedContext.HttpContext.Response.StatusCode, responseBody);
            }
        }
        catch (Exception ex)
        {
            // If an exception escapes, log it and handle it
            HandleException(ex, route, traceId);
            throw;
        }
    }

    public void OnException(ExceptionContext context)
    {
        var route = context.HttpContext.Request.Path.ToString();
        var timestamp = DateTimeOffset.UtcNow;

        // Legacy plain-text entry — keeps backward compatibility with any
        // log consumers that still read the old format.
        loggingService.LogException(context.Exception, route, timestamp);

        // Structured OTel entry — includes trace_id / span_id so this
        // exception can be joined to the full request trace.
        loggingService.LogExceptionStructured(
            correlation.TraceId,
            correlation.SpanId,
            context.Exception,
            route);

        context.Result = new ObjectResult(new
        {
            error    = "An unexpected error occurred.",
            traceId  = correlation.TraceId,
        })
        {
            StatusCode = StatusCodes.Status500InternalServerError,
        };

        context.ExceptionHandled = true;
    }

    private void HandleException(Exception ex, string route, string traceId)
    {
        var timestamp = DateTimeOffset.UtcNow;
        loggingService.LogException(ex, route, timestamp);
        loggingService.LogExceptionStructured(traceId, correlation.SpanId, ex, route);
    }

    private static object? GetRequestBody(ActionExecutingContext context)
    {
        if (context.ActionArguments.Count == 0)
            return null;

        // If there's a single argument that's not a primitive type, use it as the body
        if (context.ActionArguments.Count == 1)
        {
            var arg = context.ActionArguments.Values.First();
            if (arg != null && !arg.GetType().IsPrimitive && arg.GetType() != typeof(string))
                return arg;
        }

        // Otherwise, return all action arguments
        return context.ActionArguments.Count == 1 ? context.ActionArguments.Values.First() : context.ActionArguments;
    }

    private static object? GetResponseBody(ActionExecutedContext context)
    {
        if (context.Result is ObjectResult objectResult)
            return objectResult.Value;

        return null;
    }
}
