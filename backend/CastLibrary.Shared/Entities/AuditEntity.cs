using System;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Shared.Entities;

public class AuditEntity
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public AuditEventType EventType { get; set; }
    public string EventDescription { get; set; } = string.Empty;
    public string Endpoint { get; set; }
    public string HttpMethod { get; set; }
    public int? StatusCode { get; set; }
    public string IpAddress { get; set; }
    public string UserAgent { get; set; }
    public string RequestDetails { get; set; }
    public string ResponseDetails { get; set; }
    public bool IsSuccess { get; set; }
    public string ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }
    public string AdditionalData { get; set; }
}
