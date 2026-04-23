using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CastLibrary.Logic.Commands.Admin;
using CastLibrary.Logic.Queries.Admin;
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
