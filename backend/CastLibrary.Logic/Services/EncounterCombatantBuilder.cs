using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Services;

/// <summary>
/// Builds encounter combatants from either a library cast or a campaign player
/// card, resolving the display name, portrait URL and starting hit points.
///
/// Every path that puts cards into an encounter spot (adding a single combatant,
/// creating a whole group in one call, auto-adding the party on encounter create)
/// goes through here, so the cast and player shapes are resolved in exactly one
/// place.
/// </summary>
public interface IEncounterCombatantBuilder
{
    /// <summary>Builds a cast combatant, or null when the cast no longer exists.</summary>
    Task<EncounterCombatantDomain> FromCastAsync(
        Guid encounterId,
        Guid sourceCastId,
        Guid? originCampaignCastInstanceId = null);

    /// <summary>Builds a player combatant, or null when the player card no longer exists.</summary>
    Task<EncounterCombatantDomain> FromPlayerCardAsync(Guid encounterId, Guid playerCardId);

    /// <summary>
    /// Builds the combatant described by a request ("cast" or "player"), or null
    /// when the referenced card no longer exists or the id is missing.
    /// </summary>
    Task<EncounterCombatantDomain> FromRequestAsync(
        Guid encounterId,
        string combatantType,
        Guid? sourceCastId,
        Guid? playerCardId,
        Guid? originCampaignCastInstanceId = null);
}

public class EncounterCombatantBuilder(
    ICastReadRepository castRepository,
    IPlayerCardReadRepository playerCardRepository,
    ICampaignReadRepository campaignRepository,
    IImageKeyCreator imageKeyCreator,
    IImageStorageOperator imageStorageOperator) : IEncounterCombatantBuilder
{
    public async Task<EncounterCombatantDomain> FromRequestAsync(
        Guid encounterId,
        string combatantType,
        Guid? sourceCastId,
        Guid? playerCardId,
        Guid? originCampaignCastInstanceId = null)
    {
        if (string.Equals(combatantType, "cast", StringComparison.OrdinalIgnoreCase))
        {
            return sourceCastId is Guid castId
                ? await FromCastAsync(encounterId, castId, originCampaignCastInstanceId)
                : null;
        }

        return playerCardId is Guid cardId
            ? await FromPlayerCardAsync(encounterId, cardId)
            : null;
    }

    public async Task<EncounterCombatantDomain> FromCastAsync(
        Guid encounterId,
        Guid sourceCastId,
        Guid? originCampaignCastInstanceId = null)
    {
        var cast = await castRepository.GetByIdAsync(sourceCastId);
        if (cast is null) return null;

        return new EncounterCombatantDomain
        {
            Id = Guid.NewGuid(),
            EncounterId = encounterId,
            CombatantType = "cast",
            SourceCastId = cast.Id,
            OriginCampaignCastInstanceId = originCampaignCastInstanceId,
            DisplayName = cast.Name,
            ImageUrl = BuildCastImageUrl(cast),
            MaxHitPoints = cast.MaxHitPoints,
        };
    }

    public async Task<EncounterCombatantDomain> FromPlayerCardAsync(Guid encounterId, Guid playerCardId)
    {
        var card = await playerCardRepository.GetByIdAsync(playerCardId);
        if (card is null) return null;

        return new EncounterCombatantDomain
        {
            Id = Guid.NewGuid(),
            EncounterId = encounterId,
            CombatantType = "player",
            PlayerCardId = card.Id,
            DisplayName = card.Name,
            ImageUrl = await BuildPlayerCardImageUrlAsync(card),
            MaxHitPoints = 0, // players manage their own HP
        };
    }

    private string BuildCastImageUrl(CastDomain cast)
    {
        var imageKey = imageKeyCreator.Create(cast.DmUserId, Guid.Empty, cast.Id, EntityType.Cast);
        return imageStorageOperator.GetPublicUrl(imageKey) ?? string.Empty;
    }

    private async Task<string> BuildPlayerCardImageUrlAsync(PlayerCardDomain card)
    {
        var campaign = await campaignRepository.GetByIdAsync(card.CampaignId);
        var imageKey = imageKeyCreator.Create(campaign.DmUserId, card.CampaignId, card.PlayerUserId, EntityType.PlayerCard);
        return imageStorageOperator.GetPublicUrl(imageKey) ?? string.Empty;
    }
}
