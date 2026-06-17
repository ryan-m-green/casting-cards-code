using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CastLibrary.Logic.Commands.Admin;
using CastLibrary.Logic.Queries.Admin;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/site-configuration")]
[Authorize(Roles = "Admin")]
public class SiteConfigurationController(
    IGetConfigurationQueryHandler getConfigurationQueryHandler,
    IUpdateConfigurationCommandHandler updateConfigurationCommandHandler,
    IGetPricingDisplayQueryHandler getPricingDisplayQueryHandler,
    ICampaignReadRepository campaignReadRepository,
    ILocationReadRepository locationReadRepository,
    ISublocationReadRepository sublocationReadRepository,
    ICastReadRepository castReadRepository,
    IFactionReadRepository factionReadRepository) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetConfiguration()
    {
        var configurations = await getConfigurationQueryHandler.HandleAsync();
        return Ok(configurations);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateConfiguration([FromBody] List<UpdateConfigurationRequest> requests)
    {
        var (success, error) = await updateConfigurationCommandHandler.HandleAsync(new UpdateConfigurationCommand(requests));
        if (!success)
            return BadRequest(new { message = error });

        return Ok(new { message = "Configuration updated successfully." });
    }

    [HttpGet("pricing")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPricing()
    {
        var pricing = await getPricingDisplayQueryHandler.HandleAsync();
        return Ok(pricing);
    }

    [HttpGet("users/{userId}/card-counts")]
    public async Task<IActionResult> GetUserCardCounts(Guid userId)
    {
        var campaigns = await campaignReadRepository.GetCampaignCountByDmAsync(userId);
        var locations = await locationReadRepository.GetLocationCountByDmAsync(userId);
        var sublocations = await sublocationReadRepository.GetSublocationCountByDmAsync(userId);
        var casts = await castReadRepository.GetCastCountByDmAsync(userId);
        var factions = await factionReadRepository.GetFactionCountByDmAsync(userId);

        var response = new
        {
            Campaigns = campaigns,
            Locations = locations,
            Sublocations = sublocations,
            Casts = casts,
            Factions = factions
        };

        return Ok(response);
    }
}
