using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CastLibrary.Logic.Commands.Admin;
using CastLibrary.Logic.Queries.Admin;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController(
    IGetAdminInviteCodeQueryHandler getInviteCodeQuery,
    IGenerateAdminInviteCodeCommandHandler generateInviteCodeCommand) : ControllerBase
{
    [HttpGet("invite-code")]
    public async Task<IActionResult> GetInviteCode()
    {
        var code = await getInviteCodeQuery.HandleAsync();
        if (code is null) return Ok(null);

        return Ok(new AdminInviteCodeResponse
        {
            Code = code.Code,
            ExpiresAt = code.ExpiresAt,
        });
    }

    [HttpPost("invite-code/generate")]
    public async Task<IActionResult> GenerateInviteCode()
    {
        var code = await generateInviteCodeCommand.HandleAsync();

        return Ok(new AdminInviteCodeResponse
        {
            Code = code.Code,
            ExpiresAt = code.ExpiresAt,
        });
    }
}
