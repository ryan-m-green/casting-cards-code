namespace CastLibrary.Logic.Interfaces;

/// <summary>
/// Scoped per-request context that carries an OpenTelemetry-compatible
/// trace_id (W3C: 32 hex chars) and span_id (W3C: 16 hex chars).
///
/// Lifecycle:
///   CorrelationIdMiddleware generates the trace_id once per request.
///   Each logical operation (controller action, DB call) calls NewSpan()
///   to produce a child span_id, making individual steps distinguishable
///   inside the same trace.
/// </summary>
public interface ICorrelationContext
{
    /// <summary>32-character lowercase hex string. Set once by CorrelationIdMiddleware.</summary>
    string TraceId { get; }

    /// <summary>16-character lowercase hex string. Updated by each NewSpan() call.</summary>
    string SpanId { get; }

    /// <summary>Called by middleware to initialise the trace_id for this request.</summary>
    void SetTraceId(string traceId);

    /// <summary>
    /// Generates a new span_id, stores it on the context, and returns it.
    /// Call at the start of each controller action and each DB operation.
    /// </summary>
    string NewSpan();
}
