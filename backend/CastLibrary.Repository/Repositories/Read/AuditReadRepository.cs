using CastLibrary.Shared.Entities;
using CastLibrary.Shared.Enums;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IAuditReadRepository
{
    Task<List<AuditEntity>> GetAuditLogsAsync(int skip = 0, int take = 100);
    Task<List<AuditEntity>> GetAuditLogsByUserIdAsync(Guid userId, int skip = 0, int take = 100);
    Task<List<AuditEntity>> GetAuditLogsByEventTypeAsync(AuditEventType eventType, int skip = 0, int take = 100);
    Task<List<AuditEntity>> GetAuditLogsByDateRangeAsync(DateTime startDate, DateTime endDate, int skip = 0, int take = 100);
    Task<int> GetAuditLogsCountAsync();
    Task<int> GetAuditLogsCountByUserIdAsync(Guid userId);
    Task<int> GetAuditLogsCountByEventTypeAsync(AuditEventType eventType);
    Task<int> GetAuditLogsCountByDateRangeAsync(DateTime startDate, DateTime endDate);
}

public class AuditReadRepository : IAuditReadRepository
{
    private readonly ISqlConnectionFactory _sqlConnectionFactory;

    public AuditReadRepository(ISqlConnectionFactory sqlConnectionFactory)
    {
        _sqlConnectionFactory = sqlConnectionFactory;
    }

    public async Task<List<AuditEntity>> GetAuditLogsAsync(int skip = 0, int take = 100)
    {
        using var conn = _sqlConnectionFactory.GetConnection();
        var entities = await conn.QueryAsync<AuditEntity>(
            @"SELECT id, user_id AS UserId, user_email AS UserEmail, event_type AS EventType, 
                     event_description AS EventDescription, endpoint, http_method AS HttpMethod, 
                     status_code AS StatusCode, ip_address AS IpAddress, user_agent AS UserAgent, 
                     request_details AS RequestDetails, response_details AS ResponseDetails, 
                     is_success AS IsSuccess, error_message AS ErrorMessage, created_at AS CreatedAt, 
                     additional_data AS AdditionalData
              FROM audit_logs 
              ORDER BY created_at DESC 
              LIMIT @Take OFFSET @Skip",
            new { Take = take, Skip = skip });
        
        return entities.ToList();
    }

    public async Task<List<AuditEntity>> GetAuditLogsByUserIdAsync(Guid userId, int skip = 0, int take = 100)
    {
        using var conn = _sqlConnectionFactory.GetConnection();
        var entities = await conn.QueryAsync<AuditEntity>(
            @"SELECT id, user_id AS UserId, user_email AS UserEmail, event_type AS EventType, 
                     event_description AS EventDescription, endpoint, http_method AS HttpMethod, 
                     status_code AS StatusCode, ip_address AS IpAddress, user_agent AS UserAgent, 
                     request_details AS RequestDetails, response_details AS ResponseDetails, 
                     is_success AS IsSuccess, error_message AS ErrorMessage, created_at AS CreatedAt, 
                     additional_data AS AdditionalData
              FROM audit_logs 
              WHERE user_id = @UserId
              ORDER BY created_at DESC 
              LIMIT @Take OFFSET @Skip",
            new { UserId = userId, Take = take, Skip = skip });
        
        return entities.ToList();
    }

    public async Task<List<AuditEntity>> GetAuditLogsByEventTypeAsync(AuditEventType eventType, int skip = 0, int take = 100)
    {
        using var conn = _sqlConnectionFactory.GetConnection();
        var entities = await conn.QueryAsync<AuditEntity>(
            @"SELECT id, user_id AS UserId, user_email AS UserEmail, event_type AS EventType, 
                     event_description AS EventDescription, endpoint, http_method AS HttpMethod, 
                     status_code AS StatusCode, ip_address AS IpAddress, user_agent AS UserAgent, 
                     request_details AS RequestDetails, response_details AS ResponseDetails, 
                     is_success AS IsSuccess, error_message AS ErrorMessage, created_at AS CreatedAt, 
                     additional_data AS AdditionalData
              FROM audit_logs 
              WHERE event_type = @EventType
              ORDER BY created_at DESC 
              LIMIT @Take OFFSET @Skip",
            new { EventType = eventType, Take = take, Skip = skip });
        
        return entities.ToList();
    }

    public async Task<List<AuditEntity>> GetAuditLogsByDateRangeAsync(DateTime startDate, DateTime endDate, int skip = 0, int take = 100)
    {
        using var conn = _sqlConnectionFactory.GetConnection();
        var entities = await conn.QueryAsync<AuditEntity>(
            @"SELECT id, user_id AS UserId, user_email AS UserEmail, event_type AS EventType, 
                     event_description AS EventDescription, endpoint, http_method AS HttpMethod, 
                     status_code AS StatusCode, ip_address AS IpAddress, user_agent AS UserAgent, 
                     request_details AS RequestDetails, response_details AS ResponseDetails, 
                     is_success AS IsSuccess, error_message AS ErrorMessage, created_at AS CreatedAt, 
                     additional_data AS AdditionalData
              FROM audit_logs 
              WHERE created_at >= @StartDate AND created_at <= @EndDate
              ORDER BY created_at DESC 
              LIMIT @Take OFFSET @Skip",
            new { StartDate = startDate, EndDate = endDate, Take = take, Skip = skip });
        
        return entities.ToList();
    }

    public async Task<int> GetAuditLogsCountAsync()
    {
        using var conn = _sqlConnectionFactory.GetConnection();
        return await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM audit_logs");
    }

    public async Task<int> GetAuditLogsCountByUserIdAsync(Guid userId)
    {
        using var conn = _sqlConnectionFactory.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM audit_logs WHERE user_id = @UserId", 
            new { UserId = userId });
    }

    public async Task<int> GetAuditLogsCountByEventTypeAsync(AuditEventType eventType)
    {
        using var conn = _sqlConnectionFactory.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM audit_logs WHERE event_type = @EventType", 
            new { EventType = eventType });
    }

    public async Task<int> GetAuditLogsCountByDateRangeAsync(DateTime startDate, DateTime endDate)
    {
        using var conn = _sqlConnectionFactory.GetConnection();
        return await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM audit_logs WHERE created_at >= @StartDate AND created_at <= @EndDate", 
            new { StartDate = startDate, EndDate = endDate });
    }
}
