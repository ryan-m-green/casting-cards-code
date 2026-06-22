using System;
using System.Threading.Tasks;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Entities;
using CastLibrary.Shared.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AuditController : ControllerBase
{
    private readonly IAuditReadRepository _auditRepository;

    public AuditController(IAuditReadRepository auditRepository)
    {
        _auditRepository = auditRepository;
    }

    [HttpGet]
    public async Task<ActionResult<List<AuditEntity>>> GetAuditLogs([FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        if (take > 1000) take = 1000; // Prevent excessive data retrieval
        var logs = await _auditRepository.GetAuditLogsAsync(skip, take);
        return Ok(logs);
    }

    [HttpGet("count")]
    public async Task<ActionResult<int>> GetAuditLogsCount()
    {
        var count = await _auditRepository.GetAuditLogsCountAsync();
        return Ok(count);
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<AuditEntity>>> GetAuditLogsByUser(
        Guid userId, [FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        if (take > 1000) take = 1000;
        var logs = await _auditRepository.GetAuditLogsByUserIdAsync(userId, skip, take);
        return Ok(logs);
    }

    [HttpGet("user/{userId}/count")]
    public async Task<ActionResult<int>> GetAuditLogsCountByUser(Guid userId)
    {
        var count = await _auditRepository.GetAuditLogsCountByUserIdAsync(userId);
        return Ok(count);
    }

    [HttpGet("type/{eventType}")]
    public async Task<ActionResult<List<AuditEntity>>> GetAuditLogsByEventType(
        AuditEventType eventType, [FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        if (take > 1000) take = 1000;
        var logs = await _auditRepository.GetAuditLogsByEventTypeAsync(eventType, skip, take);
        return Ok(logs);
    }

    [HttpGet("type/{eventType}/count")]
    public async Task<ActionResult<int>> GetAuditLogsCountByEventType(AuditEventType eventType)
    {
        var count = await _auditRepository.GetAuditLogsCountByEventTypeAsync(eventType);
        return Ok(count);
    }

    [HttpGet("daterange")]
    public async Task<ActionResult<List<AuditEntity>>> GetAuditLogsByDateRange(
        [FromQuery] DateTime startDate, [FromQuery] DateTime endDate, 
        [FromQuery] int skip = 0, [FromQuery] int take = 100)
    {
        if (take > 1000) take = 1000;
        var logs = await _auditRepository.GetAuditLogsByDateRangeAsync(startDate, endDate, skip, take);
        return Ok(logs);
    }

    [HttpGet("daterange/count")]
    public async Task<ActionResult<int>> GetAuditLogsCountByDateRange(
        [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
    {
        var count = await _auditRepository.GetAuditLogsCountByDateRangeAsync(startDate, endDate);
        return Ok(count);
    }
}
