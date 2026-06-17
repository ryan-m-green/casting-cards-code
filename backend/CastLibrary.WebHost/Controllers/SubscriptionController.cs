using CastLibrary.Logic.Commands.Subscription;
using CastLibrary.Logic.Queries.Subscription;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/subscription")]
public class SubscriptionController(
    ICreateFreeTrialSubscriptionCommandHandler createFreeTrialCommand,
    IGetUserSubscriptionQueryHandler getUserSubscriptionQuery,
    IGetUserEntityLimitsQueryHandler getUserEntityLimitsQuery,
    IUserRetriever userRetriever) : ControllerBase
{
    [HttpPost("free-trial")]
    [Authorize]
    public async Task<IActionResult> CreateFreeTrial()
    {
        var userId = userRetriever.GetUserId(User);
        var result = await createFreeTrialCommand.HandleAsync(
            new CreateFreeTrialSubscriptionCommand(new CreateFreeTrialSubscriptionRequest { UserId = userId }));
        return Ok(result);
    }
    [HttpGet("user")]
    [Authorize]
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
    public async Task<IActionResult> GetUserEntityLimits()
    {
        var userId = userRetriever.GetUserId(User);
        var result = await getUserEntityLimitsQuery.HandleAsync(new GetUserEntityLimitsQuery(userId));
        return Ok(result);
    }
}
