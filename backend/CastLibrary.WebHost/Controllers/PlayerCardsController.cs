using CastLibrary.Logic.Commands.PlayerCard;
using CastLibrary.Logic.Queries.PlayerCard;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/player-cards")]
[Authorize]
public class PlayerCardsController(
    IGetPlayerCardQueryHandler getPlayerCard,
    IGetAllPlayerCardsQueryHandler getAllPlayerCards,
    IGetPlayerMemoriesQueryHandler getPlayerMemories,
    IGetPlayerTraitsQueryHandler getPlayerTraits,
    IGetPlayerSecretsQueryHandler getPlayerSecrets,
    IGetSharedPlayerSecretsQueryHandler getSharedPlayerSecrets,
    IGetPlayerCastPerceptionsQueryHandler getPlayerCastPerceptions,
    IGetCastInstancePerceptionsQueryHandler getCastInstancePerceptions,
    IGetDiscoveredCastQueryHandler getDiscoveredCast,
    IGetPlayerConditionsQueryHandler getPlayerConditions,
    ICreatePlayerCardCommandHandler createPlayerCard,
    IUpdatePlayerCardCommandHandler updatePlayerCard,
    IUploadPlayerCardImageCommandHandler uploadPlayerCardImage,
    IAssignConditionCommandHandler assignCondition,
    IRemoveConditionCommandHandler removeCondition,
    IAddMemoryCommandHandler addMemory,
    IDeleteMemoryCommandHandler deleteMemory,
    IUpsertTraitCommandHandler upsertTrait,
    IDeleteTraitCommandHandler deleteTrait,
    IToggleGoalCompleteCommandHandler toggleGoalComplete,
    IDeliverSecretCommandHandler deliverSecret,
    IShareSecretCommandHandler shareSecret,
    IDeletePlayerCardSecretCommandHandler deletePlayerCardSecret,
    IUpsertPlayerCastPerceptionCommandHandler upsertPerception,
    IAwardCurrencyCommandHandler awardGold,
    IPlayerCardWebMapper mapper,
    ICampaignWebMapper campaignMapper,
    IHubContext<CampaignHub> hub,
    IUserRetriever userRetriever) : ControllerBase
{

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(Guid campaignId)
    {
        var userId = userRetriever.GetUserId(User);
        var card = await getPlayerCard.HandleAsync(campaignId, userId);
        if (card is null) return NotFound();

        var conditions = (await getPlayerConditions.HandleAsync(card.Id)).ToList();

        return Ok(mapper.ToResponse(card, conditions));
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid campaignId)
    {
        var cards = await getAllPlayerCards.HandleAsync(campaignId);
        var responses = new List<object>();

        foreach (var card in cards)
        {
            var conditions = (await getPlayerConditions.HandleAsync(card.Id)).ToList();
            var traits = (await getPlayerTraits.HandleAsync(card.Id)).ToList();
            responses.Add(mapper.ToResponse(card, conditions, traits));
        }

        return Ok(responses);
    }

    [HttpGet("party")]
    public async Task<IActionResult> GetParty(Guid campaignId)
    {
        var data = await getDiscoveredCast.HandleAsync(campaignId);

        var partyCards = new List<object>();
        foreach (var card in data.PartyCards)
        {
            var conditions = (await getPlayerConditions.HandleAsync(card.Id)).ToList();
            partyCards.Add(mapper.ToResponse(card, conditions));
        }

        var companions = data.QuestingCompanions.Select(c => campaignMapper.ToCastInstanceResponse(c)).ToList();

        return Ok(new { partyCards, questingCompanions = companions, partyAnchorSublocationInstanceId = data.PartyAnchorSublocationInstanceId });
    }

    [HttpGet("{playerCardId}/memories")]
    public async Task<IActionResult> GetMemories(Guid playerCardId)
    {
        var memories = await getPlayerMemories.HandleAsync(playerCardId);
        return Ok(memories.Select(mapper.ToResponse));
    }

    [HttpGet("{playerCardId}/traits")]
    public async Task<IActionResult> GetTraits(Guid playerCardId)
    {
        var traits = await getPlayerTraits.HandleAsync(playerCardId);
        return Ok(traits.Select(mapper.ToResponse));
    }

    [HttpGet("{playerCardId}/secrets")]
    public async Task<IActionResult> GetSecrets(Guid playerCardId)
    {
        var secrets = await getPlayerSecrets.HandleAsync(playerCardId);
        return Ok(secrets.Select(mapper.ToResponse));
    }

    [HttpGet("{playerCardId}/secrets/shared")]
    public async Task<IActionResult> GetSharedSecrets(Guid playerCardId)
    {
        var secrets = await getSharedPlayerSecrets.HandleAsync(playerCardId);
        return Ok(secrets.Select(mapper.ToResponse));
    }

    [HttpGet("{playerCardId}/perceptions")]
    public async Task<IActionResult> GetPerceptions(Guid playerCardId)
    {
        var perceptions = await getPlayerCastPerceptions.HandleAsync(playerCardId);
        return Ok(perceptions.Select(mapper.ToResponse));
    }

    [HttpGet("cast-instance/{castInstanceId}/perceptions")]
    public async Task<IActionResult> GetCastInstancePerceptions(Guid castInstanceId)
    {
        var perceptions = await getCastInstancePerceptions.HandleAsync(castInstanceId);
        return Ok(perceptions.Select(mapper.ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid campaignId, [FromBody] CreatePlayerCardRequest request)
    {
        var userId = userRetriever.GetUserId(User);
        var card = await createPlayerCard.HandleAsync(new CreatePlayerCardCommand(campaignId, userId, request));
        return Created(string.Empty, mapper.ToResponse(card));
    }

    [HttpPut("{playerCardId}")]
    public async Task<IActionResult> Update(Guid playerCardId, [FromBody] UpdatePlayerCardRequest request)
    {
        var userId = userRetriever.GetUserId(User);
        var card = await updatePlayerCard.HandleAsync(new UpdatePlayerCardCommand(playerCardId, userId, request));
        if (card is null) return NotFound();

        return Ok(mapper.ToResponse(card));
    }

    [HttpPost("{playerCardId}/image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(Guid campaignId, Guid playerCardId, IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file provided.");

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest("Only JPEG, PNG, and WebP images are supported.");

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest("File size must not exceed 5 MB.");

        var userId = userRetriever.GetUserId(User);
        var (success, _) = await uploadPlayerCardImage.HandleAsync(
            new UploadPlayerCardImageCommand(playerCardId, userId, file.OpenReadStream(), file.ContentType));

        if (!success) return NotFound();

        var card = await getPlayerCard.HandleAsync(campaignId, userId);
        return Ok(new { imageUrl = card?.ImageUrl });
    }

    [HttpPost("{playerCardId}/conditions")]
    public async Task<IActionResult> AssignCondition(Guid campaignId, Guid playerCardId, [FromBody] AssignConditionRequest request)
    {
        var condition = await assignCondition.HandleAsync(new AssignConditionCommand(playerCardId, campaignId, request));
        if (condition is null) return NotFound();

        await hub.Clients.Group(campaignId.ToString())
            .SendAsync("ConditionAssigned", new { playerCardId, conditionId = condition.Id, condition.ConditionName, condition.AssignedAt, tickCount = DateTime.UtcNow.Ticks });

        return Created(string.Empty, condition);
    }

    [HttpDelete("{playerCardId}/conditions/{conditionId}")]
    public async Task<IActionResult> RemoveCondition(Guid campaignId, Guid playerCardId, Guid conditionId)
    {
        var success = await removeCondition.HandleAsync(new RemoveConditionCommand(playerCardId, conditionId, campaignId));
        if (!success) return NotFound();

        await hub.Clients.Group(campaignId.ToString())
            .SendAsync("ConditionRemoved", new { playerCardId, conditionId, tickCount = DateTime.UtcNow.Ticks });

        return NoContent();
    }


    [HttpPost("{playerCardId}/memories")]
    public async Task<IActionResult> AddMemory(Guid playerCardId, [FromBody] AddMemoryRequest request)
    {
        var userId = userRetriever.GetUserId(User);
        var memory = await addMemory.HandleAsync(new AddMemoryCommand(playerCardId, userId, request));
        if (memory is null) return NotFound();

        return Created(string.Empty, mapper.ToResponse(memory));
    }

    [HttpDelete("{playerCardId}/memories/{memoryId}")]
    public async Task<IActionResult> DeleteMemory(Guid playerCardId, Guid memoryId)
    {
        var userId = userRetriever.GetUserId(User);
        var success = await deleteMemory.HandleAsync(new DeleteMemoryCommand(playerCardId, memoryId, userId));
        return success ? NoContent() : NotFound();
    }


    [HttpPost("{playerCardId}/traits")]
    public async Task<IActionResult> UpsertTrait(Guid playerCardId, [FromBody] UpsertTraitRequest request)
    {
        var userId = userRetriever.GetUserId(User);
        var trait = await upsertTrait.HandleAsync(new UpsertTraitCommand(playerCardId, userId, request));
        if (trait is null) return NotFound();

        return Ok(mapper.ToResponse(trait));
    }

    [HttpDelete("{playerCardId}/traits/{traitId}")]
    public async Task<IActionResult> DeleteTrait(Guid playerCardId, Guid traitId)
    {
        var userId = userRetriever.GetUserId(User);
        var success = await deleteTrait.HandleAsync(new DeleteTraitCommand(playerCardId, traitId, userId));
        return success ? NoContent() : NotFound();
    }

    [HttpPost("{playerCardId}/traits/{traitId}/toggle")]
    public async Task<IActionResult> ToggleGoal(Guid playerCardId, Guid traitId)
    {
        var userId = userRetriever.GetUserId(User);
        var trait = await toggleGoalComplete.HandleAsync(new ToggleGoalCompleteCommand(playerCardId, traitId, userId));
        if (trait is null) return NotFound();

        return Ok(mapper.ToResponse(trait));
    }


    [HttpPost("{playerCardId}/secrets")]
    public async Task<IActionResult> DeliverSecret(Guid campaignId, Guid playerCardId, [FromBody] DeliverSecretRequest request)
    {
        var result = await deliverSecret.HandleAsync(new DeliverSecretCommand(playerCardId, campaignId, request));
        if (result is null) return NotFound();

        await hub.Clients.Group(campaignId.ToString())
            .SendAsync("SecretDelivered", new
            {
                campaignId = campaignId.ToString(),
                playerUserId = result.PlayerUserId.ToString(),
                content = result.Secret.Content,
            });

        return Created(string.Empty, mapper.ToResponse(result.Secret));
    }

    [HttpPost("{playerCardId}/secrets/{secretId}/share")]
    public async Task<IActionResult> ShareSecret(Guid campaignId, Guid playerCardId, Guid secretId, [FromQuery] string sharedBy = "PLAYER")
    {
        var secret = await shareSecret.HandleAsync(new ShareSecretCommand(playerCardId, secretId, sharedBy));
        if (secret is null) return NotFound();

        var cards = await getAllPlayerCards.HandleAsync(campaignId);
        var card = cards.FirstOrDefault(c => c.Id == playerCardId);

        await hub.Clients.Group(campaignId.ToString())
            .SendAsync("SecretShared", new
            {
                playerCardId,
                secretId,
                sharedBy,
                secretContent = secret.Content,
                playerName = card?.Name ?? string.Empty,
                playerImageUrl = card?.ImageUrl ?? string.Empty,
                playerRaceClass = card is not null ? $"{card.Race} Â· {card.Class}" : string.Empty,
            });

        return Ok(mapper.ToResponse(secret));
    }

    [HttpDelete("{playerCardId}/secrets/{secretId}")]
    public async Task<IActionResult> DeleteSecret(Guid campaignId, Guid playerCardId, Guid secretId)
    {
        var success = await deletePlayerCardSecret.HandleAsync(
            new DeletePlayerCardSecretCommand(playerCardId, secretId, campaignId));

        if (!success) return NotFound();

        await hub.Clients.Group(campaignId.ToString())
            .SendAsync("PlayerSecretDeleted", new { campaignId, playerCardId, secretId });

        return NoContent();
    }


    [HttpPost("{playerCardId}/perceptions")]
    public async Task<IActionResult> UpsertPerception(Guid playerCardId, [FromBody] UpsertPlayerCastPerceptionRequest request)
    {
        var userId = userRetriever.GetUserId(User);
        var perception = await upsertPerception.HandleAsync(new UpsertPlayerCastPerceptionCommand(playerCardId, userId, request));
        if (perception is null) return NotFound();

        return Ok(mapper.ToResponse(perception));
    }


    [HttpPost("/api/campaigns/{campaignId}/gold-award")]
    public async Task<IActionResult> AwardGold(Guid campaignId, [FromBody] AwardCurrencyRequest request)
    {
        var userId = userRetriever.GetUserId(User);
        var result = await awardGold.HandleAsync(new AwardCurrencyCommand(campaignId, userId, request));
        if (result is null) return NotFound();

        if (result.PlayerAwards.Count > 0)
        {
            foreach (var award in result.PlayerAwards)
            {
                await hub.Clients.Group(campaignId.ToString())
                    .SendAsync("GoldAwarded", new
                    {
                        campaignId = campaignId.ToString(),
                        playerUserId = award.PlayerUserId.ToString(),
                        amount = award.Amount,
                        currency = result.Currency,
                        note = result.Note,
                        tickCount = DateTime.UtcNow.Ticks,
                    });
            }
        }
        else
        {
            await hub.Clients.Group(campaignId.ToString())
                .SendAsync("GoldAwarded", new
                {
                    campaignId = campaignId.ToString(),
                    playerUserId = result.TargetPlayerUserId?.ToString(),
                    amount = result.Amount,
                    currency = result.Currency,
                    note = result.Note,
                    tickCount = DateTime.UtcNow.Ticks,
                });
        }

        return Ok(new
        {
            currency = result.Currency,
            playerAwards = result.PlayerAwards.Select(a => new
            {
                playerUserId = a.PlayerUserId.ToString(),
                amount = a.Amount,
            }),
        });
    }
}
