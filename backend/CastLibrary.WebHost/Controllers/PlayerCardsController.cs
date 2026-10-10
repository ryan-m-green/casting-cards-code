using CastLibrary.Logic.Commands.PlayerCard;
using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Logic.Commands.CampaignChronicles;
using CastLibrary.Logic.Queries.PlayerCard;
using CastLibrary.Logic.Queries.Campaign;
using CastLibrary.Logic.Services;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;
using CastLibrary.Shared.Requests;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.Mappers;
using CastLibrary.WebHost.MetadataHelpers;
using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/campaigns/{campaignId}/player-cards")]
[Authorize]
[EnableRateLimiting("GeneralApi")]
public class PlayerCardsController(
    IGetPlayerCardQueryHandler getPlayerCard,
    IGetAllPlayerCardsQueryHandler getAllPlayerCards,
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
    IUpsertTraitCommandHandler upsertTrait,
    IDeleteTraitCommandHandler deleteTrait,
    IToggleGoalCompleteCommandHandler toggleGoalComplete,
    IToggleTraitSharedCommandHandler toggleTraitShared,
    IDeliverSecretCommandHandler deliverSecret,
    IShareSecretCommandHandler shareSecret,
    IDeletePlayerCardSecretCommandHandler deletePlayerCardSecret,
    IUpdatePlayerCardSecretCommandHandler updatePlayerCardSecret,
    IUpsertPlayerCastPerceptionCommandHandler upsertPerception,
    IAwardCurrencyCommandHandler awardGold,
    IAddChronicleCommandHandler addChronicleCommand,
    IGetPlayerInventoryQueryHandler getPlayerInventoryQuery,
    IUseInventoryItemCommandHandler useInventoryItemCommand,
    IPlayerCardWebMapper mapper,
    ICampaignWebMapper campaignMapper,
    IHubContext<CampaignHub> hub,
    ISignalRNotificationService notifications,
    IUserRetriever userRetriever,
    ICampaignAccessService campaignAccess,
    IFileValidationService fileValidationService) : ControllerBase
{
    private Task<bool> CallerCanAccess(Guid campaignId) =>
        campaignAccess.IsMemberOrOwnerAsync(campaignId, userRetriever.GetUserId(User));

    private Task<bool> CallerOwns(Guid campaignId) =>
        campaignAccess.IsOwnerAsync(campaignId, userRetriever.GetUserId(User));

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(Guid campaignId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var userId = userRetriever.GetUserId(User);
        var card = await getPlayerCard.HandleAsync(campaignId, userId);
        if (card is null) return NotFound();

        var conditions = (await getPlayerConditions.HandleAsync(card.Id)).ToList();

        return Ok(mapper.ToResponse(card, conditions));
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid campaignId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
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
        if (!await CallerCanAccess(campaignId)) return Forbid();
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

    [HttpGet("{playerCardId}/traits")]
    public async Task<IActionResult> GetTraits(Guid campaignId, Guid playerCardId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var traits = await getPlayerTraits.HandleAsync(playerCardId);
        return Ok(traits.Select(mapper.ToResponse));
    }

    [HttpGet("{playerCardId}/secrets")]
    public async Task<IActionResult> GetSecrets(Guid campaignId, Guid playerCardId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var secrets = await getPlayerSecrets.HandleAsync(playerCardId);
        return Ok(secrets.Select(mapper.ToResponse));
    }

    [HttpGet("{playerCardId}/secrets/shared")]
    public async Task<IActionResult> GetSharedSecrets(Guid campaignId, Guid playerCardId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var secrets = await getSharedPlayerSecrets.HandleAsync(playerCardId);
        return Ok(secrets.Select(mapper.ToResponse));
    }

    [HttpGet("{playerCardId}/perceptions")]
    public async Task<IActionResult> GetPerceptions(Guid campaignId, Guid playerCardId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var perceptions = await getPlayerCastPerceptions.HandleAsync(playerCardId);
        return Ok(perceptions.Select(mapper.ToResponse));
    }

    [HttpGet("cast-instance/{castInstanceId}/perceptions")]
    public async Task<IActionResult> GetCastInstancePerceptions(Guid campaignId, Guid castInstanceId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var perceptions = await getCastInstancePerceptions.HandleAsync(castInstanceId);
        return Ok(perceptions.Select(mapper.ToResponse));
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid campaignId, [FromBody] CreatePlayerCardRequest request)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var userId = userRetriever.GetUserId(User);
        var card = await createPlayerCard.HandleAsync(new CreatePlayerCardCommand(campaignId, userId, request));
        return Created(string.Empty, mapper.ToResponse(card));
    }

    [HttpPut("{playerCardId}")]
    public async Task<IActionResult> Update(Guid campaignId, Guid playerCardId, [FromBody] UpdatePlayerCardRequest request)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var userId = userRetriever.GetUserId(User);
        var card = await updatePlayerCard.HandleAsync(new UpdatePlayerCardCommand(playerCardId, userId, request));
        if (card is null) return NotFound();

        // The card is read back for the broadcast: the write hands the card back as it now stands but
        // without the portrait's public url, and the read is keyed on the card's own player (see
        // BroadcastPlayerCardUpdatedAsync).
        var written = await getPlayerCard.HandleAsync(campaignId, card.PlayerUserId);
        await BroadcastPlayerCardUpdatedAsync(campaignId, written ?? card);

        return Ok(mapper.ToResponse(card));
    }

    [HttpPost("{playerCardId}/image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(Guid campaignId, Guid playerCardId, IFormFile file)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        
        var validationResult = await fileValidationService.ValidateFileAsync(file, 20 * 1024 * 1024, 
            new[] { "image/jpeg", "image/png", "image/webp" });

        if (!validationResult.IsValid)
            return BadRequest(validationResult.ErrorMessage);

        var userId = userRetriever.GetUserId(User);
        var (success, _) = await uploadPlayerCardImage.HandleAsync(
            new UploadPlayerCardImageCommand(playerCardId, userId, file.OpenReadStream(), validationResult.DetectedContentType));

        if (!success) return NotFound();

        var card = await getPlayerCard.HandleAsync(campaignId, userId);

        // The party is watching this card through the GM's grid and the drawer it opens from; the new
        // portrait is on the card the read just handed back, so the watchers take it on from there.
        await BroadcastPlayerCardUpdatedAsync(campaignId, card);

        return Ok(new { imageUrl = card?.ImageUrl });
    }

    /// <summary>
    /// A player wrote their card's own details â€” the write the GM's party grid and the player drawer
    /// it opens from are watching. The card's fields are sent as the write left them, the portrait's
    /// public url among them, so a watcher takes the change on from what it is handed rather than
    /// reading the card back (see ISignalRNotificationService.BroadcastPlayerCardUpdatedAsync). Sent
    /// through the notification service so the send is recorded for the Admin's SignalR inspector.
    /// </summary>
    private async Task BroadcastPlayerCardUpdatedAsync(Guid campaignId, PlayerCardDomain card)
    {
        if (card is null) return;

        await notifications.BroadcastPlayerCardUpdatedAsync(campaignId, new
        {
            campaignId = campaignId.ToString(),
            playerCardId = card.Id.ToString(),
            playerUserId = card.PlayerUserId.ToString(),
            name = card.Name,
            race = card.Race,
            @class = card.Class,
            description = card.Description,
            imageUrl = card.ImageUrl,
        });
    }

    private async Task BroadcastTraitsChangedAsync(Guid campaignId, Guid playerCardId)
    {
        var traits = (await getPlayerTraits.HandleAsync(playerCardId))
            .Select(mapper.ToResponse)
            .Select(t => new
            {
                id = t.Id.ToString(),
                playerCardId = t.PlayerCardId.ToString(),
                traitType = t.TraitType.ToString(),
                content = t.Content,
                isCompleted = t.IsCompleted,
                isShared = t.IsShared,
                createdAt = t.CreatedAt,
            })
            .ToList();

        await notifications.BroadcastPlayerCardTraitsChangedAsync(campaignId, new
        {
            campaignId = campaignId.ToString(),
            playerCardId = playerCardId.ToString(),
            traits,
        });
    }

    [HttpPost("{playerCardId}/traits")]
    public async Task<IActionResult> UpsertTrait(Guid campaignId, Guid playerCardId, [FromBody] UpsertTraitRequest request)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var userId = userRetriever.GetUserId(User);
        var trait = await upsertTrait.HandleAsync(new UpsertTraitCommand(playerCardId, userId, request));
        if (trait is null) return NotFound();

        await BroadcastTraitsChangedAsync(campaignId, playerCardId);
        return Ok(mapper.ToResponse(trait));
    }

    [HttpDelete("{playerCardId}/traits/{traitId}")]
    public async Task<IActionResult> DeleteTrait(Guid campaignId, Guid playerCardId, Guid traitId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var userId = userRetriever.GetUserId(User);
        var success = await deleteTrait.HandleAsync(new DeleteTraitCommand(playerCardId, traitId, userId));
        if (!success) return NotFound();

        await BroadcastTraitsChangedAsync(campaignId, playerCardId);
        return NoContent();
    }

    [HttpPost("{playerCardId}/traits/{traitId}/toggle")]
    public async Task<IActionResult> ToggleGoal(Guid campaignId, Guid playerCardId, Guid traitId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var userId = userRetriever.GetUserId(User);
        var trait = await toggleGoalComplete.HandleAsync(new ToggleGoalCompleteCommand(playerCardId, traitId, userId));
        if (trait is null) return NotFound();

        await BroadcastTraitsChangedAsync(campaignId, playerCardId);
        return Ok(mapper.ToResponse(trait));
    }

    [HttpPost("{playerCardId}/traits/{traitId}/toggle-shared")]
    public async Task<IActionResult> ToggleTraitShared(Guid campaignId, Guid playerCardId, Guid traitId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var userId = userRetriever.GetUserId(User);
        var trait = await toggleTraitShared.HandleAsync(new ToggleTraitSharedCommand(playerCardId, traitId, userId));
        if (trait is null) return NotFound();

        await BroadcastTraitsChangedAsync(campaignId, playerCardId);
        return Ok(mapper.ToResponse(trait));
    }


    [HttpPost("{playerCardId}/secrets")]
    public async Task<IActionResult> DeliverSecret(Guid campaignId, Guid playerCardId, [FromBody] DeliverSecretRequest request)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var userId = userRetriever.GetUserId(User);
        var isDm = await CallerOwns(campaignId);
        if (!isDm)
        {
            var callerCard = await getPlayerCard.HandleAsync(campaignId, userId);
            if (callerCard is null || callerCard.Id != playerCardId) return Forbid();
        }

        var result = await deliverSecret.HandleAsync(new DeliverSecretCommand(playerCardId, campaignId, request));
        if (result is null) return NotFound();

        if (isDm)
        {
            await notifications.BroadcastSecretDeliveredAsync(campaignId, new
            {
                campaignId = campaignId.ToString(),
                playerUserId = result.PlayerUserId.ToString(),
                content = result.Secret.Content,
            });

            // A delivered secret lands in the player's own character area (middle-right): the notice
            // that lights that area's button is aimed at them alone.
            await notifications.BroadcastGridAreaNoticeAsync(campaignId, new
            {
                campaignId = campaignId.ToString(),
                gridArea = "middle-right",
                userId = result.PlayerUserId.ToString(),
            });
        }
        else
        {
            await notifications.BroadcastPlayerSecretCreatedAsync(campaignId, new
            {
                campaignId = campaignId.ToString(),
                playerCardId = playerCardId.ToString(),
                secretId = result.Secret.Id.ToString(),
                content = result.Secret.Content,
            });
        }

        return Created(string.Empty, mapper.ToResponse(result.Secret));
    }

    [HttpPost("{playerCardId}/secrets/{secretId}/share")]
    public async Task<IActionResult> ShareSecret(Guid campaignId, Guid playerCardId, Guid secretId, [FromQuery] string sharedBy = "PLAYER")
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var secret = await shareSecret.HandleAsync(new ShareSecretCommand(playerCardId, secretId, sharedBy));
        if (secret is null) return NotFound();

        var cards = await getAllPlayerCards.HandleAsync(campaignId);
        var card = cards.FirstOrDefault(c => c.Id == playerCardId);

        await notifications.BroadcastSecretSharedAsync(campaignId, new
        {
            playerCardId,
            secretId,
            sharedBy,
            secretContent = secret.Content,
            playerName = card?.Name ?? string.Empty,
            playerImageUrl = card?.ImageUrl ?? string.Empty,
            playerRaceClass = card is not null ? $"{card.Race} · {card.Class}" : string.Empty,
        });

        return Ok(mapper.ToResponse(secret));
    }

    [HttpDelete("{playerCardId}/secrets/{secretId}")]
    public async Task<IActionResult> DeleteSecret(Guid campaignId, Guid playerCardId, Guid secretId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var success = await deletePlayerCardSecret.HandleAsync(
            new DeletePlayerCardSecretCommand(playerCardId, secretId, campaignId));

        if (!success) return NotFound();

        await notifications.BroadcastPlayerSecretDeletedAsync(campaignId, new { campaignId, playerCardId, secretId });

        return NoContent();
    }

    [HttpPut("{playerCardId}/secrets/{secretId}")]
    public async Task<IActionResult> UpdateSecret(Guid campaignId, Guid playerCardId, Guid secretId, [FromBody] UpdatePlayerCardSecretRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var secret = await updatePlayerCardSecret.HandleAsync(
            new UpdatePlayerCardSecretCommand(playerCardId, secretId, request));

        if (secret is null) return NotFound();

        await notifications.BroadcastPlayerSecretChangedAsync(campaignId, new
        {
            campaignId = campaignId.ToString(),
            playerCardId = playerCardId.ToString(),
            secretId = secretId.ToString(),
            content = secret.Content,
        });

        return Ok(mapper.ToResponse(secret));
    }


    [HttpPost("{playerCardId}/perceptions")]
    public async Task<IActionResult> UpsertPerception(Guid campaignId, Guid playerCardId, [FromBody] UpsertPlayerCastPerceptionRequest request)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var userId = userRetriever.GetUserId(User);
        var perception = await upsertPerception.HandleAsync(new UpsertPlayerCastPerceptionCommand(playerCardId, userId, request));
        if (perception is null) return NotFound();

        return Ok(mapper.ToResponse(perception));
    }


    [HttpGet("inventory/mine")]
    public async Task<IActionResult> GetMyInventory(Guid campaignId)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var playerUserId = userRetriever.GetUserId(User);
        var inventory = await getPlayerInventoryQuery.HandleAsync(
            new GetPlayerInventoryQuery(campaignId, playerUserId));
        return Ok(inventory);
    }

    [HttpPost("inventory/use")]
    public async Task<IActionResult> UseInventoryItem(Guid campaignId, [FromBody] UseInventoryItemRequest request)
    {
        if (!await CallerCanAccess(campaignId)) return Forbid();
        var playerUserId = userRetriever.GetUserId(User);
        var result = await useInventoryItemCommand.HandleAsync(
            new UseInventoryItemCommand(campaignId, playerUserId, request));
        if (!result) return NotFound();

        await hub.Clients.Group(campaignId.ToString()).SendAsync("InventoryItemUsed", new { campaignId, playerUserId, inventoryItemId = request.InventoryItemId });

        return NoContent();
    }

    [HttpGet("inventory/{playerUserId}")]
    [Authorize(Roles = "DM,Admin")]
    public async Task<IActionResult> GetPlayerInventory(Guid campaignId, Guid playerUserId)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
        var inventory = await getPlayerInventoryQuery.HandleAsync(
            new GetPlayerInventoryQuery(campaignId, playerUserId));
        return Ok(inventory);
    }

    [HttpPost("/api/campaigns/{campaignId}/gold-award")]
    public async Task<IActionResult> AwardGold(Guid campaignId, [FromBody] AwardCurrencyRequest request)
    {
        if (!await CallerOwns(campaignId)) return Forbid();
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

        await RecordTreasureChronicleAsync(campaignId, result);

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

    /// <summary>
    /// The award as one campaign chronicle entry: every player it reached is a linked entity, and the
    /// body says what each of them received. The amount and any note the award carried ride in the
    /// body too, and the in-game day/time-of-day stamp is taken from the campaign clock when the entry
    /// is stored (see AddChronicleCommandHandler).
    /// </summary>
    private async Task RecordTreasureChronicleAsync(Guid campaignId, AwardCurrencyResult result)
    {
        var recipients = new List<(Guid PlayerUserId, string PlayerName, int Amount)>();

        if (result.PlayerAwards.Count > 0)
        {
            foreach (var award in result.PlayerAwards)
                if (award.PlayerUserId != Guid.Empty)
                    recipients.Add((award.PlayerUserId, award.PlayerName, award.Amount));
        }
        else if (result.TargetPlayerUserId is { } targetId && targetId != Guid.Empty)
        {
            recipients.Add((targetId, result.TargetPlayerName, result.Amount));
        }

        if (recipients.Count == 0) return;

        var lines = recipients
            .Select(r => $"{DisplayNameOf(r.PlayerName)} received {r.Amount} {result.Currency}")
            .ToList();
        if (!string.IsNullOrWhiteSpace(result.Note)) lines.Add(result.Note.Trim());

        var request = new CreateChronicleRequest
        {
            ContentType = ChronicleContentType.CoinReward,
            Title = "Treasure Awarded",
            Body = string.Join("\n", lines),
            IsGmOnly = false,
            Participants = recipients
                .Select(r => new ChronicleParticipant
                {
                    EntityType = "player",
                    EntityId = r.PlayerUserId.ToString(),
                    EntityName = r.PlayerName ?? string.Empty,
                })
                .ToList(),
        };

        var chronicleId = await addChronicleCommand.HandleAsync(new AddChronicleCommand(campaignId, request));
        await notifications.BroadcastChronicleAddedAsync(campaignId, new { campaignId, chronicleId });
    }

    private static string DisplayNameOf(string name) =>
        string.IsNullOrWhiteSpace(name) ? "a player" : name.Trim();
}
