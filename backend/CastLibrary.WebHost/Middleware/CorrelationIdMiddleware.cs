using CastLibrary.Logic.Interfaces;
using CastLibrary.WebHost.Infrastructure;

namespace CastLibrary.WebHost.Middleware;

/// <summary>
/// ASP.NET Core middleware that runs at the very start of every request.
///
/// Responsibilities:
///   1. Read X-Trace-Id from the incoming request header (if present),
///      or generate a new W3C-compatible trace_id.
///   2. Stamp the scoped ICorrelationContext with the trace_id and a root span_id.
///   3. Echo the trace_id and span_id back on the response headers so clients
///      can correlate their calls to server log entries.
/// </summary>
public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    private const string TraceHeader = "X-Trace-Id";
    private const string SpanHeader  = "X-Span-Id";

    public async Task InvokeAsync(HttpContext context, ICorrelationContext correlation)
    {
        // Honour an upstream trace_id if one was forwarded; otherwise start a new trace.
        var traceId = context.Request.Headers[TraceHeader].FirstOrDefault()
                      ?? ((CorrelationContext)correlation).GenerateTraceId();

        correlation.SetTraceId(traceId);
        correlation.NewSpan(); // root span for this HTTP request

        // Surface the IDs on the response so clients can correlate.
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[TraceHeader] = correlation.TraceId;
            context.Response.Headers[SpanHeader]  = correlation.SpanId;
            return Task.CompletedTask;
        });

        await next(context);
    }
}
