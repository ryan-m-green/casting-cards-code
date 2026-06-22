using System;
using System.Threading.Tasks;
using CastLibrary.Shared.Entities;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Interfaces;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository;
using Dapper;

namespace CastLibrary.Logic.Services;

public class AuditLoggingService : IAuditLoggingService
{
    private readonly ISqlConnectionFactory _sqlConnectionFactory;

    public AuditLoggingService(ISqlConnectionFactory sqlConnectionFactory)
    {
        _sqlConnectionFactory = sqlConnectionFactory;
    }

    public async Task LogEventAsync(
        Guid userId,
        string userEmail,
        AuditEventType eventType,
        string eventDescription,
        string endpoint = null,
        string httpMethod = null,
        int? statusCode = null,
        string ipAddress = null,
        string userAgent = null,
        string requestDetails = null,
        string responseDetails = null,
        bool isSuccess = true,
        string errorMessage = null,
        string additionalData = null)
    {
        var auditEntry = new AuditEntity
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            UserEmail = userEmail,
            EventType = eventType,
            EventDescription = eventDescription,
            Endpoint = endpoint,
            HttpMethod = httpMethod,
            StatusCode = statusCode,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            RequestDetails = requestDetails,
            ResponseDetails = responseDetails,
            IsSuccess = isSuccess,
            ErrorMessage = errorMessage,
            CreatedAt = DateTime.UtcNow,
            AdditionalData = additionalData
        };

        using var conn = _sqlConnectionFactory.GetConnection();
        await conn.ExecuteAsync(
            @"INSERT INTO audit_logs (id, user_id, user_email, event_type, event_description, endpoint, http_method, 
                                     status_code, ip_address, user_agent, request_details, response_details, 
                                     is_success, error_message, created_at, additional_data)
              VALUES (@Id, @UserId, @UserEmail, @EventType, @EventDescription, @Endpoint, @HttpMethod, 
                      @StatusCode, @IpAddress, @UserAgent, @RequestDetails, @ResponseDetails, 
                      @IsSuccess, @ErrorMessage, @CreatedAt, @AdditionalData)",
            auditEntry);
    }

    public async Task LogAuthenticationEventAsync(
        Guid userId,
        string userEmail,
        AuditEventType eventType,
        string eventDescription,
        string ipAddress = null,
        string userAgent = null,
        bool isSuccess = true,
        string errorMessage = null)
    {
        await LogEventAsync(
            userId,
            userEmail,
            eventType,
            eventDescription,
            endpoint: null, // Let middleware capture actual endpoint
            httpMethod: null, // Let middleware capture actual method
            ipAddress: ipAddress,
            userAgent: userAgent,
            isSuccess: isSuccess,
            errorMessage: errorMessage);
    }

    public async Task LogSubscriptionEventAsync(
        Guid userId,
        string userEmail,
        AuditEventType eventType,
        string eventDescription,
        string additionalData = null)
    {
        await LogEventAsync(
            userId,
            userEmail,
            eventType,
            eventDescription,
            endpoint: null, // Let middleware capture actual endpoint
            httpMethod: null, // Let middleware capture actual method
            isSuccess: true,
            additionalData: additionalData);
    }

    public async Task LogPermissionEventAsync(
        Guid userId,
        string userEmail,
        AuditEventType eventType,
        string eventDescription,
        string targetUserId = null,
        string additionalData = null)
    {
        var data = targetUserId != null 
            ? $"TargetUserId: {targetUserId}" + (additionalData != null ? $", {additionalData}" : "")
            : additionalData;

        await LogEventAsync(
            userId,
            userEmail,
            eventType,
            eventDescription,
            endpoint: null, // Let middleware capture actual endpoint
            httpMethod: null, // Let middleware capture actual method
            isSuccess: true,
            additionalData: data);
    }

    public async Task LogDataEventAsync(
        Guid userId,
        string userEmail,
        AuditEventType eventType,
        string eventDescription,
        string entityType = null,
        string entityId = null,
        string additionalData = null)
    {
        var data = new List<string>();
        
        if (!string.IsNullOrEmpty(entityType))
            data.Add($"EntityType: {entityType}");
        
        if (!string.IsNullOrEmpty(entityId))
            data.Add($"EntityId: {entityId}");
        
        if (!string.IsNullOrEmpty(additionalData))
            data.Add(additionalData);

        await LogEventAsync(
            userId,
            userEmail,
            eventType,
            eventDescription,
            isSuccess: true,
            additionalData: data.Count > 0 ? string.Join(", ", data) : null);
    }

    public async Task LogSecurityEventAsync(
        Guid? userId,
        string userEmail,
        AuditEventType eventType,
        string eventDescription,
        string ipAddress = null,
        string userAgent = null,
        string additionalData = null)
    {
        await LogEventAsync(
            userId ?? Guid.Empty,
            userEmail ?? "Anonymous",
            eventType,
            eventDescription,
            ipAddress: ipAddress,
            userAgent: userAgent,
            isSuccess: false,
            additionalData: additionalData);
    }
}
