using System;
using System.Threading.Tasks;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Shared.Interfaces;

public interface IAuditLoggingService
{
    Task LogEventAsync(
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
        string additionalData = null);

    Task LogAuthenticationEventAsync(
        Guid userId,
        string userEmail,
        AuditEventType eventType,
        string eventDescription,
        string ipAddress = null,
        string userAgent = null,
        bool isSuccess = true,
        string errorMessage = null);

    Task LogSubscriptionEventAsync(
        Guid userId,
        string userEmail,
        AuditEventType eventType,
        string eventDescription,
        string additionalData = null);

    Task LogPermissionEventAsync(
        Guid userId,
        string userEmail,
        AuditEventType eventType,
        string eventDescription,
        string targetUserId = null,
        string additionalData = null);

    Task LogDataEventAsync(
        Guid userId,
        string userEmail,
        AuditEventType eventType,
        string eventDescription,
        string entityType = null,
        string entityId = null,
        string additionalData = null);

    Task LogSecurityEventAsync(
        Guid? userId,
        string userEmail,
        AuditEventType eventType,
        string eventDescription,
        string ipAddress = null,
        string userAgent = null,
        string additionalData = null);
}
