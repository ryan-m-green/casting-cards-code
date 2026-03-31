using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController(
    IGetUserKeywordsQueryHandler getUserKeywordsQuery,
    IUserRetriever userRetriever) : ControllerBase
{
    [HttpGet("keywords")]
    public async Task<IActionResult> GetKeywords()
    {
        var keywords = await getUserKeywordsQuery.HandleAsync(userRetriever.GetUserId(User));

        return Ok(new { keywords });
    }
}
