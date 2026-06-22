using CastLibrary.Logic.Commands.Subscription;
using CastLibrary.Logic.Queries.Subscription;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using CastLibrary.Shared.Interfaces;
using CastLibrary.Shared.Enums;
namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/subscription")]
public class SubscriptionController(
    ICreateFreeTrialSubscriptionCommandHandler createFreeTrialCommand,
    IGetUserSubscriptionQueryHandler getUserSubscriptionQuery,
    IGetUserEntityLimitsQueryHandler getUserEntityLimitsQuery,
    IUserRetriever userRetriever,
    IAuditLoggingService auditService) : ControllerBase
{
    [HttpPost("free-trial")]
    [Authorize]
    [EnableRateLimiting("SubscriptionRefresh")]
    public async Task<IActionResult> CreateFreeTrial()
    {
        var userId = userRetriever.GetUserId(User);
        
        try
        {
            var result = await createFreeTrialCommand.HandleAsync(
                new CreateFreeTrialSubscriptionCommand(new CreateFreeTrialSubscriptionRequest { UserId = userId }));
            
            // Get user email for audit logging
            var userEmail = userRetriever.GetEmail(User);
            
            // Log successful subscription creation
            await auditService.LogSubscriptionEventAsync(
                userId,
                userEmail,
                AuditEventType.SubscriptionCreated,
                "Free trial subscription created successfully",
                additionalData: $"SubscriptionId: {result.Id}, Status: {result.Status}");
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            // Log failed subscription creation
            await auditService.LogSubscriptionEventAsync(
                userId,
                "Unknown",
                AuditEventType.SubscriptionCreated,
                "Free trial subscription creation failed",
                additionalData: $"Error: {ex.Message}");
            
            throw;
        }
    }
    [HttpGet("user")]
    [Authorize]
    [EnableRateLimiting("SubscriptionRefresh")]
    public async Task<IActionResult> GetUserSubscription()
    {
        var userId = userRetriever.GetUserId(User);
        var result = await getUserSubscriptionQuery.HandleAsync(new GetUserSubscriptionQuery(userId));
        if (result is null)
            return NotFound();
        return Ok(result);
    }

    [HttpGet("entity-limits")]
    [Authorize]
    [EnableRateLimiting("SubscriptionRefresh")]
    public async Task<IActionResult> GetUserEntityLimits()
    {
        var userId = userRetriever.GetUserId(User);
        var result = await getUserEntityLimitsQuery.HandleAsync(new GetUserEntityLimitsQuery(userId));
        return Ok(result);
    }
}
