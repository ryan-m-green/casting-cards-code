using CastLibrary.Logic.Interfaces;
using CastLibrary.Logic.Services;

namespace CastLibrary.WebHost.Infrastructure;

/// <summary>
/// Scoped implementation of ICorrelationContext.
/// Produces W3C-compatible trace_id (128-bit / 32 hex) and span_id (64-bit / 16 hex).
/// </summary>
public sealed class CorrelationContext(ISystemValuesService systemValuesService) : ICorrelationContext
{
    public string TraceId { get; private set; } = string.Empty;
    public string SpanId  { get; private set; } = string.Empty;

    public void SetTraceId(string traceId) => TraceId = traceId;

    public string NewSpan()
    {
        // 8 random bytes → 16 lowercase hex chars (W3C span_id format)
        var bytes = new byte[8];
        Random.Shared.NextBytes(bytes);
        SpanId = Convert.ToHexString(bytes).ToLowerInvariant();
        return SpanId;
    }

    /// <summary>Generates a 128-bit (32 hex char) trace_id.</summary>
    public string GenerateTraceId()
    {
        // Two systemValuesService.GetNewGuid() values concatenated give 32 random hex chars
        var a = systemValuesService.GetNewGuid().ToByteArray();
        var b = systemValuesService.GetNewGuid().ToByteArray();
        return Convert.ToHexString(a[..8]).ToLowerInvariant()
             + Convert.ToHexString(b[..8]).ToLowerInvariant();
    }
}
