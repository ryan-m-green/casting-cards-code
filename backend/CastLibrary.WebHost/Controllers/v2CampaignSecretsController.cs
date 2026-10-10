using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Logic.Validators;
using CastLibrary.Shared.Exceptions;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaign/{campaignId}/secrets")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class CampaignSecretsController(
    IGetCampaignSecretsQueryHandler getSecretsQuery,
    IAddCampaignSecretCommandHandler addSecretCommand,
    IUpdateSecretCommandHandler updateSecretCommand,
    IRevealSecretCommandHandler revealSecretCommand,
    IResealSecretCommandHandler resealSecretCommand,
    IDeleteCampaignSecretCommandHandler deleteSecretCommand,
    ICampaignWebMapper mapper,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    ISignalRNotificationService notificationService) : ControllerBase
{
    private Task<bool> CallerCanView(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet]
    public async Task<IActionResult> GetSecrets(Guid campaignId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var secrets = await getSecretsQuery.HandleAsync(campaignId);
        var response = secrets.Select(mapper.ToSecretResponse).ToList();

        return Ok(response);
    }

    [HttpGet("{secretId}")]
    public async Task<IActionResult> GetSecret(Guid campaignId, Guid secretId)
    {
        if (!await CallerCanView(campaignId)) return Forbid();

        var secrets = await getSecretsQuery.HandleAsync(campaignId, secretId);
        if (!secrets.Any())
        {
            return NotFound();
        }

        var response = mapper.ToSecretResponse(secrets.First());
        return Ok(response);
    }

    [HttpPost]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> AddSecret(Guid campaignId, [FromBody] AddCampaignSecretRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var secret = await addSecretCommand.HandleAsync(new AddCampaignSecretCommand(campaignId, request));
        var response = mapper.ToSecretResponse(secret);

        await notificationService.BroadcastSecretCreatedAsync(campaignId, new
        {
            secretId = secret.Id,
            campaignId = secret.CampaignId,
            castInstanceId = secret.CastInstanceId,
            locationInstanceId = secret.LocationInstanceId,
            sublocationInstanceId = secret.SublocationInstanceId,
            content = secret.Content,
            sortOrder = secret.SortOrder
        });

        return Ok(response);
    }

    [HttpPatch("{secretId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> UpdateSecret(Guid campaignId, Guid secretId, [FromBody] UpdateSecretRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var secret = await updateSecretCommand.HandleAsync(new UpdateSecretCommand(campaignId, secretId, request));
        if (secret is null) return NotFound();

        await notificationService.BroadcastToCampaignAsync(campaignId, "SecretUpdated", new
        {
            campaignId = campaignId,
            secretId = secretId,
        });

        var response = mapper.ToSecretResponse(secret);
        return Ok(response);
    }

    [HttpPost("{secretId}/reveal")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> RevealSecret(Guid campaignId, Guid secretId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var secret = await revealSecretCommand.HandleAsync(new RevealSecretCommand(secretId, campaignId));
        if (secret is null) return NotFound();

        await notificationService.BroadcastPlayerSecretRevealedAsync(campaignId, new SecretRevealedEvent
        {
            SecretId = secretId,
            CampaignId = campaignId,
            CastInstanceId = secret.CastInstanceId,
            LocationInstanceId = secret.LocationInstanceId,
            SublocationInstanceId = secret.SublocationInstanceId,
            SecretContent = secret.Content,
        });

        var response = mapper.ToSecretResponse(secret);
        return Ok(response);
    }

    [HttpPatch("{secretId}/reseal")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> ResealSecret(Guid campaignId, Guid secretId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var secret = await resealSecretCommand.HandleAsync(new ResealSecretCommand(secretId, campaignId));
        if (secret is null) return NotFound();

        await notificationService.BroadcastSecretResealedAsync(campaignId, new SecretResealedEvent
        {
            SecretId = secretId,
            CampaignId = campaignId,
            CastInstanceId = secret.CastInstanceId,
            LocationInstanceId = secret.LocationInstanceId,
            SublocationInstanceId = secret.SublocationInstanceId,
        });

        var response = mapper.ToSecretResponse(secret);
        return Ok(response);
    }

    [HttpDelete("{secretId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> DeleteSecret(Guid campaignId, Guid secretId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var deleted = await deleteSecretCommand.HandleAsync(new DeleteCampaignSecretCommand(secretId, campaignId));
        if (!deleted) return NotFound();

        await notificationService.BroadcastSecretDeletedAsync(campaignId, new
        {
            secretId = secretId,
            campaignId = campaignId
        });

        return NoContent();
    }
}