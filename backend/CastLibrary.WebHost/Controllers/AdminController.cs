using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using CastLibrary.Logic.Commands.Admin;
using CastLibrary.Logic.Queries.Admin;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.Shared.Interfaces;
using CastLibrary.Shared.Enums;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
[EnableRateLimiting("GeneralApi")]
public class AdminController(
    IGetAllUsersQueryHandler getAllUsersQuery,
    IDeleteUserCommandHandler deleteUserCommand,
    ICreatePlayerCommandHandler createPlayerCommand,
    ISetCampaignIsDemoCommandHandler setCampaignIsDemoCommand,
    IGetDemoCampaignsQueryHandler getDemoCampaignsQuery,
    IGetDemoPlayersQueryHandler getDemoPlayersQuery,
    IAddUserToDemoCampaignCommandHandler addUserToDemoCampaignCommand,
    IChangeUserRoleCommandHandler changeUserRoleCommand,
    IUpdateUserSubscriptionCommandHandler updateUserSubscriptionCommand,
    IUserRetriever userRetriever,
    IAuditLoggingService auditService) : ControllerBase
{
    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await getAllUsersQuery.HandleAsync();
        var response = users.Select(u => new UserManagementResponse
        {
            Id = u.Id,
            Email = u.Email,
            DisplayName = u.DisplayName,
            Role = u.Role,
            CreatedAt = u.CreatedAt,
            SubscriptionId = u.SubscriptionId,
            StripeCustomerId = u.StripeCustomerId,
            StripeSubscriptionId = u.StripeSubscriptionId,
            Status = u.Status,
            BypassPayment = u.BypassPayment,
            CurrentPeriodEnd = u.CurrentPeriodEnd,
            LockLevel = u.LockLevel
        }).ToList();
        return Ok(response);
    }

    [HttpPost("users")]
    public async Task<IActionResult> CreatePlayer([FromBody] CreatePlayerRequest request)
    {
        var currentUserId = userRetriever.GetUserId(User);
        var currentUserEmail = userRetriever.GetEmail(User);

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Email is required." });
        if (string.IsNullOrWhiteSpace(request.DisplayName))
            return BadRequest(new { message = "Display name is required." });
        if (request.Role != "DM" && request.Role != "Player")
            return BadRequest(new { message = "Role must be DM or Player." });

        var (success, error) = await createPlayerCommand.HandleAsync(new CreatePlayerCommand(request));
        if (!success)
        {
            // Log failed player creation
            await auditService.LogPermissionEventAsync(
                currentUserId,
                currentUserEmail,
                AuditEventType.UserRegistration,
                $"Failed to create user account for {request.Email}",
                additionalData: $"Email: {request.Email}, Role: {request.Role}, Error: {error}");

            return BadRequest(new { message = error });
        }

        // Log successful player creation
        await auditService.LogPermissionEventAsync(
            currentUserId,
            currentUserEmail,
            AuditEventType.UserRegistration,
            $"Created user account for {request.Email}",
            additionalData: $"Email: {request.Email}, Role: {request.Role}");

        return Ok(new { message = "Player created successfully." });
    }

    [HttpPatch("campaigns/{campaignId}/demo")]
    public async Task<IActionResult> SetCampaignIsDemo(Guid campaignId, [FromBody] SetCampaignIsDemoRequest request)
    {
        var currentUserId = userRetriever.GetUserId(User);
        var currentUserEmail = userRetriever.GetEmail(User);

        try
        {
            await setCampaignIsDemoCommand.HandleAsync(new SetCampaignIsDemoCommand(campaignId, request.IsDemo));
            
            // Log campaign demo status change
            await auditService.LogPermissionEventAsync(
                currentUserId,
                currentUserEmail,
                AuditEventType.ConfigurationChange,
                $"Changed campaign {campaignId} demo status to {request.IsDemo}",
                additionalData: $"CampaignId: {campaignId}, IsDemo: {request.IsDemo}");
            
            return NoContent();
        }
        catch (Exception ex)
        {
            // Log failed campaign demo status change
            await auditService.LogPermissionEventAsync(
                currentUserId,
                currentUserEmail,
                AuditEventType.ConfigurationChange,
                $"Failed to change campaign {campaignId} demo status",
                additionalData: $"CampaignId: {campaignId}, IsDemo: {request.IsDemo}, Error: {ex.Message}");
            
            throw;
        }
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
        var assignments = await getDemoPlayersQuery.HandleAsync();
        return Ok(assignments.ToDictionary(k => k.Key.ToString(), v => v.Value.ToString()));
    }

    [HttpPost("campaigns/{campaignId}/players/{userId}")]
    public async Task<IActionResult> AddUserToDemoCampaign(Guid campaignId, Guid userId)
    {
        var currentUserId = userRetriever.GetUserId(User);
        var currentUserEmail = userRetriever.GetEmail(User);

        var success = await addUserToDemoCampaignCommand.HandleAsync(new AddUserToDemoCampaignCommand(campaignId, userId));
        if (!success)
        {
            // Log failed demo campaign assignment
            await auditService.LogPermissionEventAsync(
                currentUserId,
                currentUserEmail,
                AuditEventType.CampaignAccessGranted,
                $"Failed to add user {userId} to demo campaign {campaignId}",
                additionalData: $"CampaignId: {campaignId}, UserId: {userId}");
            
            return BadRequest(new { message = "Campaign not found or is not a demo campaign." });
        }

        // Log successful demo campaign assignment
        await auditService.LogPermissionEventAsync(
            currentUserId,
            currentUserEmail,
            AuditEventType.CampaignAccessGranted,
            $"Added user {userId} to demo campaign {campaignId}",
            additionalData: $"CampaignId: {campaignId}, UserId: {userId}");

        return NoContent();
    }

    [HttpDelete("users/{userId}")]
    public async Task<IActionResult> DeleteUser(Guid userId)
    {
        var currentUserId = userRetriever.GetUserId(User);
        var currentUserEmail = userRetriever.GetEmail(User);

        if (currentUserId == userId)
        {
            return BadRequest(new { message = "Cannot delete your own account." });
        }

        try
        {
            await deleteUserCommand.HandleAsync(userId);
            
            // Log successful user deletion
            await auditService.LogPermissionEventAsync(
                currentUserId,
                currentUserEmail,
                AuditEventType.AccountDeletion,
                $"Deleted user account {userId}",
                targetUserId: userId.ToString(),
                additionalData: "User deleted by admin");
            
            return Ok(new { message = "User deleted successfully." });
        }
        catch (Exception ex)
        {
            // Log failed user deletion
            await auditService.LogPermissionEventAsync(
                currentUserId,
                currentUserEmail,
                AuditEventType.AccountDeletion,
                $"Failed to delete user account {userId}",
                targetUserId: userId.ToString(),
                additionalData: $"Error: {ex.Message}");
            
            throw;
        }
    }

    [HttpPatch("users/{userId}/role")]
    public async Task<IActionResult> ChangeUserRole(Guid userId, [FromBody] ChangeUserRoleRequest request)
    {
        var currentUserId = userRetriever.GetUserId(User);
        var currentUserEmail = userRetriever.GetEmail(User);

        var (success, error) = await changeUserRoleCommand.HandleAsync(
            new ChangeUserRoleCommand(currentUserId, userId, request));

        if (!success)
        {
            // Log failed role change attempt
            await auditService.LogPermissionEventAsync(
                currentUserId,
                currentUserEmail,
                AuditEventType.RoleAssigned,
                $"Failed to change role for user {userId}",
                targetUserId: userId.ToString(),
                additionalData: $"TargetRole: {request.NewRole}, Error: {error}");

            return BadRequest(new { message = error });
        }

        // Log successful role change
        await auditService.LogPermissionEventAsync(
            currentUserId,
            currentUserEmail,
            AuditEventType.RoleAssigned,
            $"Changed role for user {userId} to {request.NewRole}",
            targetUserId: userId.ToString(),
            additionalData: $"TargetRole: {request.NewRole}");

        return NoContent();
    }

    [HttpPatch("users/{userId}/subscription")]
    public async Task<IActionResult> UpdateUserSubscription(Guid userId, [FromBody] UpdateUserSubscriptionRequest request)
    {
        var currentUserId = userRetriever.GetUserId(User);
        var currentUserEmail = userRetriever.GetEmail(User);

        try
        {
            await updateUserSubscriptionCommand.HandleAsync(userId, request);
            
            // Log successful subscription update
            await auditService.LogPermissionEventAsync(
                currentUserId,
                currentUserEmail,
                AuditEventType.SubscriptionUpdated,
                $"Updated subscription for user {userId}",
                targetUserId: userId.ToString(),
                additionalData: $"Status: {request.Status}, BypassPayment: {request.BypassPayment}, LockLevel: {request.LockLevel}");
            
            return NoContent();
        }
        catch (Exception ex)
        {
            // Log failed subscription update
            await auditService.LogPermissionEventAsync(
                currentUserId,
                currentUserEmail,
                AuditEventType.SubscriptionUpdated,
                $"Failed to update subscription for user {userId}",
                targetUserId: userId.ToString(),
                additionalData: $"Error: {ex.Message}");
            
            throw;
        }
    }
}
