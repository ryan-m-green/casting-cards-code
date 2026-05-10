using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CastLibrary.Logic.Commands.Admin;
using CastLibrary.Logic.Queries.Admin;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.MetadataHelpers;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController(
    IGetAdminInviteCodeQueryHandler getInviteCodeQuery,
    IGenerateAdminInviteCodeCommandHandler generateInviteCodeCommand,
    IGetAllUsersQueryHandler getAllUsersQuery,
    IDeleteUserCommandHandler deleteUserCommand,
    ICreatePlayerCommandHandler createPlayerCommand,
    ISetCampaignIsDemoCommandHandler setCampaignIsDemoCommand,
    IGetDemoCampaignsQueryHandler getDemoCampaignsQuery,
    IGetDemoPlayersQueryHandler getDemoPlayersQuery,
    IAddUserToDemoCampaignCommandHandler addUserToDemoCampaignCommand,
    IUserRetriever userRetriever) : ControllerBase
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

    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await getAllUsersQuery.HandleAsync();
        var response = users.Select(u => new UserManagementResponse
        {
            Id = u.Id,
            Email = u.Email,
            DisplayName = u.DisplayName,
            Role = u.Role.ToString(),
            CreatedAt = u.CreatedAt,
        }).ToList();

        return Ok(response);
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreatePlayer([FromBody] CreatePlayerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email is required." });
        if (string.IsNullOrWhiteSpace(request.DisplayName))
            return BadRequest(new { message = "Display name is required." });
        if (request.Role != "DM" && request.Role != "Player")
            return BadRequest(new { message = "Role must be DM or Player." });

        var (success, error) = await createPlayerCommand.HandleAsync(new CreatePlayerCommand(request));
        if (!success)
            return BadRequest(new { message = error });

        return Ok(new { message = "Player created successfully." });
    }

    [HttpPatch("campaigns/{campaignId}/demo")]
    public async Task<IActionResult> SetCampaignIsDemo(Guid campaignId, [FromBody] SetCampaignIsDemoRequest request)
    {
        await setCampaignIsDemoCommand.HandleAsync(new SetCampaignIsDemoCommand(campaignId, request.IsDemo));
        return NoContent();
    }

    [HttpGet("campaigns/demo")]
    public async Task<IActionResult> GetDemoCampaigns()
    {
        var campaigns = await getDemoCampaignsQuery.HandleAsync();
        return Ok(campaigns.Select(c => new { id = c.Id, name = c.Name }));
    }

    [HttpGet("campaigns/demo/players")]
    public async Task<IActionResult> GetDemoPlayers()
    {
        var userIds = await getDemoPlayersQuery.HandleAsync();
        return Ok(userIds);
    }

    [HttpPost("campaigns/{campaignId}/players/{userId}")]
    public async Task<IActionResult> AddUserToDemoCampaign(Guid campaignId, Guid userId)
    {
        var success = await addUserToDemoCampaignCommand.HandleAsync(new AddUserToDemoCampaignCommand(campaignId, userId));
        if (!success) return BadRequest(new { message = "Campaign not found or is not a demo campaign." });
        return NoContent();
    }

    [HttpDelete("users/{userId}")]
    public async Task<IActionResult> DeleteUser(Guid userId)
    {
        var currentUserId = userRetriever.GetUserId(User);

        if (currentUserId == userId)
        {
            return BadRequest(new { message = "Cannot delete your own account." });
        }

        await deleteUserCommand.HandleAsync(userId);
        return Ok(new { message = "User deleted successfully." });
    }
}
