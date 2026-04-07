namespace CastLibrary.Logic.Interfaces;

/// <summary>
/// Structured, OpenTelemetry-compatible logging service.
///
/// All methods write a single JSON Lines entry to the daily log file.
/// Every structured entry carries trace_id and span_id for correlation.
///
/// Semantic conventions followed:
///   http.*       — HTTP request/response fields
///   db.*         — Database operation fields
///   exception.*  — Exception fields
///   code.*       — Source-code sublocation fields
/// </summary>
public interface ILoggingService
{
    // ── Legacy plain-text methods (kept for backward compatibility) ───────────

    void LogException(Exception exception, string route, DateTimeOffset timestamp);
    void LogInformation(string message);
    void LogWarning(string message);
    void LogError(string message, Exception exception = null);

    // ── Structured OTel-compatible methods ────────────────────────────────────

    /// <summary>
    /// Log an incoming HTTP request at the controller boundary.
    /// OTel fields: http.method, http.route, http.target, http.client_ip
    /// </summary>
    void LogRequest(
        string  traceId,
        string  spanId,
        string  method,
        string  route,
        string  target,
        string  clientIp,
        object body);

    /// <summary>
    /// Log an outgoing HTTP response at the controller boundary.
    /// OTel fields: http.status_code
    /// </summary>
    void LogResponse(
        string  traceId,
        string  spanId,
        int     statusCode,
        object body);

    /// <summary>
    /// Log a mapper transformation (any direction: request→domain,
    /// domain→response, entity→domain, domain→entity).
    /// OTel fields: code.namespace, code.function
    /// </summary>
    void LogMapping(
        string  traceId,
        string  spanId,
        string  codeNamespace,
        string  codeFunction,
        string  direction,
        object input,
        object output);

    /// <summary>
    /// Log a database operation before execution (rowsAffected = null)
    /// and after execution (rowsAffected = actual count).
    /// OTel fields: db.system, db.operation, db.sql.table
    /// </summary>
    void LogDbOperation(
        string  traceId,
        string  spanId,
        string  dbOperation,
        string  dbTable,
        object parameters,
        int?    rowsAffected = null);

    /// <summary>
    /// Log an unhandled exception with full OTel exception.* fields
    /// and the correlation IDs from the current request.
    /// </summary>
    void LogExceptionStructured(
        string    traceId,
        string    spanId,
        Exception exception,
        string    route);
}
