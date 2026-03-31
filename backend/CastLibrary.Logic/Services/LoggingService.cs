using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using CastLibrary.Logic.Interfaces;

namespace CastLibrary.Logic.Services;

/// <summary>
/// OpenTelemetry-compatible structured logging service.
///
/// Every log entry is written as a single-line JSON object (JSON Lines format)
/// to a daily rotating file at the configured path.  All structured methods
/// follow OTel semantic conventions for http.*, db.*, exception.*, and code.*.
///
/// The file path defaults to: C:\Repository\Cast Library\logs
/// Override with appsettings key "Logging:FilePath".
/// </summary>
public class LoggingService : ILoggingService
{
    private readonly ILogger<ILoggingService> _logger;
    private readonly string _filePath;
    private readonly string _filePathErrors;

    // One lock object per process — file writes must be serialised.
    private static readonly object _fileLock = new();

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = false,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter() },
        ReferenceHandler = ReferenceHandler.IgnoreCycles,
    };

    public LoggingService(ILogger<ILoggingService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _filePath = configuration["Logging:FilePath"] ?? @"C:\Repository\Cast Library\logs";
        _filePathErrors = configuration["Logging:FilePathError"] ?? @"C:\Repository\Cast Library\logs\errors";
    }

    // ── Legacy plain-text methods ─────────────────────────────────────────────

    public void LogException(Exception exception, string route, DateTimeOffset timestamp)
    {
        _logger.LogError(exception, "Unhandled exception on route {Route} at {Timestamp}", route, timestamp);
        WriteStructured("ERROR", "exception", new Dictionary<string, object>
        {
            ["http.route"] = route,
            ["exception.type"] = exception.GetType().FullName,
            ["exception.message"] = exception.Message,
            ["exception.stacktrace"] = exception.StackTrace,
        });
    }

    public void LogInformation(string message)
    {
        _logger.LogInformation("{Message}", message);
        WriteStructured("INFO", "log.info", new Dictionary<string, object> { ["message"] = message });
    }

    public void LogWarning(string message)
    {
        _logger.LogWarning("{Message}", message);
        WriteStructured("WARN", "log.warn", new Dictionary<string, object> { ["message"] = message });
    }

    public void LogError(string message, Exception exception = null)
    {
        _logger.LogError(exception, "{Message}", message);
        WriteStructured("ERROR", "log.error", new Dictionary<string, object>
        {
            ["message"] = message,
            ["exception.type"] = exception?.GetType().FullName,
            ["exception.message"] = exception?.Message,
            ["exception.stacktrace"] = exception?.StackTrace,
        });
    }

    // ── Structured OTel methods ───────────────────────────────────────────────

    public void LogRequest(
        string traceId,
        string spanId,
        string method,
        string route,
        string target,
        string clientIp,
        object body)
    {
        WriteStructured("INFO", "http.request", new Dictionary<string, object>
        {
            ["trace_id"] = traceId,
            ["span_id"] = spanId,
            ["http.method"] = method,
            ["http.route"] = route,
            ["http.target"] = target,
            ["http.client_ip"] = clientIp,
            ["request.body"] = SafeSerialize(body),
        });
    }

    public void LogResponse(
        string traceId,
        string spanId,
        int statusCode,
        object body)
    {
        WriteStructured("INFO", "http.response", new Dictionary<string, object>
        {
            ["trace_id"] = traceId,
            ["span_id"] = spanId,
            ["http.status_code"] = statusCode,
            ["response.body"] = SafeSerialize(body),
        });
    }

    public void LogMapping(
        string traceId,
        string spanId,
        string codeNamespace,
        string codeFunction,
        string direction,
        object input,
        object output)
    {
        WriteStructured("INFO", "mapping", new Dictionary<string, object>
        {
            ["trace_id"] = traceId,
            ["span_id"] = spanId,
            ["code.namespace"] = codeNamespace,
            ["code.function"] = codeFunction,
            ["mapping.direction"] = direction,
            ["mapping.input"] = SafeSerialize(input),
            ["mapping.output"] = SafeSerialize(output),
        });
    }

    public void LogDbOperation(
        string traceId,
        string spanId,
        string dbOperation,
        string dbTable,
        object parameters,
        int? rowsAffected = null)
    {
        var phase = rowsAffected.HasValue ? "db.operation.end" : "db.operation.start";

        var entry = new Dictionary<string, object>
        {
            ["trace_id"] = traceId,
            ["span_id"] = spanId,
            ["db.system"] = "postgresql",
            ["db.operation"] = dbOperation,
            ["db.sql.table"] = dbTable,
            ["db.parameters"] = SafeSerialize(parameters),
        };

        if (rowsAffected.HasValue)
            entry["db.rows_affected"] = rowsAffected.Value;

        WriteStructured("INFO", phase, entry);
    }

    public void LogExceptionStructured(
        string traceId,
        string spanId,
        Exception exception,
        string route)
    {
        _logger.LogError(exception, "[{TraceId}] Unhandled exception on route {Route}", traceId, route);
        WriteStructured("ERROR", "exception", new Dictionary<string, object>
        {
            ["trace_id"] = traceId,
            ["span_id"] = spanId,
            ["http.route"] = route,
            ["exception.type"] = exception.GetType().FullName,
            ["exception.message"] = exception.Message,
            ["exception.stacktrace"] = exception.StackTrace,
        });
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /// <summary>
    /// Writes a complete OTel log record as a single-line JSON object.
    /// The timestamp and severity are always injected at the top level.
    /// Routing: ERROR (and above) → Logging:FilePathError; everything else → Logging:FilePathInfo.
    /// </summary>
    private void WriteStructured(string severity, string eventName, Dictionary<string, object> attributes)
    {
        try
        {
            // Build the OTel log record envelope.
            var record = new Dictionary<string, object>
            {
                ["timestamp"] = DateTimeOffset.UtcNow.ToString("O"),
                ["severity"] = severity,
                ["event"] = eventName,
            };

            // Merge caller-supplied attributes into the envelope.
            foreach (var (key, value) in attributes)
                record[key] = value;

            var json = JsonSerializer.Serialize(record, _jsonOptions);

            // Route based on severity: ERROR and above go to the dedicated error log.
            var isError = severity is "ERROR" or "FATAL" or "CRITICAL";
            var directory = isError ? _filePathErrors : _filePath;

            lock (_fileLock)
            {
                Directory.CreateDirectory(directory);
                var fileName = Path.Combine(directory, $"cast-library-{DateTime.UtcNow:yyyy-MM-dd}.log");
                File.AppendAllText(fileName, json + Environment.NewLine);
            }
        }
        catch
        {
            // File logging must never crash the application.
        }
    }

    /// <summary>
    /// Serialises an arbitrary object to a JSON string for embedding inside a
    /// log record.  Returns null on failure rather than throwing.
    /// </summary>
    private static string SafeSerialize(object obj)
    {
        if (obj is null) return null;
        try
        {
            // If the object is already a string (e.g. a pre-serialised payload)
            // embed it verbatim.
            if (obj is string s) return s;
            return JsonSerializer.Serialize(obj, _jsonOptions);
        }
        catch
        {
            return "[serialization-error]";
        }
    }
}
