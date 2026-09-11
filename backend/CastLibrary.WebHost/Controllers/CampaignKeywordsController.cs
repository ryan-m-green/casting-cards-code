using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaign-keywords")]
[Authorize]
public class CampaignKeywordsController(
    IGetCampaignKeywordsQueryHandler getCampaignKeywordsQuery,
    IAddCampaignKeywordCommandHandler addCampaignKeywordCommand,
    IDeleteCampaignKeywordCommandHandler deleteCampaignKeywordCommand,
    IUserRetriever userRetriever) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetKeywords([FromQuery] string? cardType)
    {
        var keywords = await getCampaignKeywordsQuery.HandleAsync(
            userRetriever.GetUserId(User), cardType);

        return Ok(new { keywords });
    }

    [HttpPost]
    public async Task<IActionResult> AddKeyword([FromBody] AddCampaignKeywordRequest request)
    {
        var keyword = await addCampaignKeywordCommand.HandleAsync(
            new AddCampaignKeywordCommand(userRetriever.GetUserId(User), request.CardType, request.Keyword));

        if (string.IsNullOrEmpty(keyword)) return BadRequest();

        return Ok(new { keyword });
    }

    [HttpDelete("{keyword}")]
    public async Task<IActionResult> DeleteKeyword(string keyword, [FromQuery] string? cardType)
    {
        await deleteCampaignKeywordCommand.HandleAsync(
            new DeleteCampaignKeywordCommand(userRetriever.GetUserId(User), cardType ?? string.Empty, keyword));

        return NoContent();
    }
}
