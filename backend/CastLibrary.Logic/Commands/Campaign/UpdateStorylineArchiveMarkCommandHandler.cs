using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CastLibrary.Logic.Commands.Campaign;

public interface IUpdateStorylineArchiveMarkCommandHandler
{
    Task<UpdateStorylineArchiveMarkResult> HandleAsync(UpdateStorylineArchiveMarkCommand command);
}

public class UpdateStorylineArchiveMarkResult
{
    public bool Success { get; set; }
    public bool CastTravelOccurred { get; set; }
    public CastTravelData CastTravelData { get; set; }
}

public class CastTravelData
{
    public Guid CastInstanceId { get; set; }
    public Guid ToLocationInstanceId { get; set; }
    public Guid ToSublocationInstanceId { get; set; }
    public Guid? FromSublocationInstanceId { get; set; }
    public bool IsVisible { get; set; }
}

public class UpdateStorylineArchiveMarkCommandHandler(
    IStorylineUpdateRepository storylineUpdateRepository,
    IStorylineReadRepository storylineReadRepository,
    ICampaignUpdateRepository campaignUpdateRepository) : IUpdateStorylineArchiveMarkCommandHandler
{
    public async Task<UpdateStorylineArchiveMarkResult> HandleAsync(UpdateStorylineArchiveMarkCommand command)
    {
        // Update the archive mark
        await storylineUpdateRepository.UpdateMarkedForArchiveAsync(command.EventId, command.MarkedForArchive);

        var result = new UpdateStorylineArchiveMarkResult
        {
            Success = true,
            CastTravelOccurred = false,
            CastTravelData = new CastTravelData
            {
                CastInstanceId = Guid.Empty,
                ToLocationInstanceId = Guid.Empty,
                ToSublocationInstanceId = Guid.Empty,
                FromSublocationInstanceId = null,
                IsVisible = false
            }
        };

        // Handle cast travel for archive mark toggle
        var campaignEvent = await storylineReadRepository.GetByIdAsync(command.EventId);
        if (campaignEvent?.LinkedEntities != null)
        {
            var castTraveledEntity = campaignEvent.LinkedEntities.FirstOrDefault(le => le.EntityType.ToLower() == "cast-traveled");
            if (castTraveledEntity != null)
            {
                Guid castInstanceId;
                Guid? fromInstanceId;
                Guid? toInstanceId;
                Guid locationInstanceId;

                if (castTraveledEntity.CardMovement.ToInstanceId.HasValue)
                {
                    // Use new CardMovement structure
                    castInstanceId = Guid.Parse(castTraveledEntity.EntityId);
                    fromInstanceId = castTraveledEntity.CardMovement.FromInstanceId;
                    toInstanceId = castTraveledEntity.CardMovement.ToInstanceId;
                    locationInstanceId = castTraveledEntity.CardMovement.LocationInstanceId ?? Guid.Empty;
                }
                else
                {
                    // Fallback to parsing old format from entityId for backward compatibility
                    var travelData = JsonSerializer.Deserialize<CastTravelTriggerData>(castTraveledEntity.EntityId);
                    if (travelData == null)
                    {
                        return result;
                    }
                    castInstanceId = travelData.CastInstanceId;
                    fromInstanceId = travelData.FromSublocationInstanceId;
                    toInstanceId = travelData.ToSublocationInstanceId;
                    locationInstanceId = travelData.ToLocationInstanceId;
                }

                if (command.MarkedForArchive)
                {
                    // Marking as archived: move cast member to new sublocation
                    await campaignUpdateRepository.TravelCastAsync(
                        castInstanceId,
                        locationInstanceId,
                        toInstanceId ?? Guid.Empty);

                    result.CastTravelOccurred = true;
                    result.CastTravelData = new CastTravelData
                    {
                        CastInstanceId = castInstanceId,
                        ToLocationInstanceId = locationInstanceId,
                        ToSublocationInstanceId = toInstanceId ?? Guid.Empty,
                        FromSublocationInstanceId = fromInstanceId,
                        IsVisible = true
                    };
                }
                else
                {
                    // Unmarking from archive: move cast member back to original sublocation
                    if (fromInstanceId.HasValue)
                    {
                        await campaignUpdateRepository.TravelCastAsync(
                            castInstanceId,
                            locationInstanceId,
                            fromInstanceId.Value);

                        result.CastTravelOccurred = true;
                        result.CastTravelData = new CastTravelData
                        {
                            CastInstanceId = castInstanceId,
                            ToLocationInstanceId = locationInstanceId,
                            ToSublocationInstanceId = fromInstanceId.Value,
                            FromSublocationInstanceId = fromInstanceId.Value,
                            IsVisible = false
                        };
                    }
                }
            }
        }

        return result;
    }

    private class CastTravelTriggerData
    {
        [JsonPropertyName("castInstanceId")]
        public Guid CastInstanceId { get; set; }

        [JsonPropertyName("toLocationInstanceId")]
        public Guid ToLocationInstanceId { get; set; }

        [JsonPropertyName("toSublocationInstanceId")]
        public Guid ToSublocationInstanceId { get; set; }

        [JsonPropertyName("fromSublocationInstanceId")]
        public Guid? FromSublocationInstanceId { get; set; }
    }
}

public class UpdateStorylineArchiveMarkCommand
{
    public UpdateStorylineArchiveMarkCommand(Guid eventId, bool markedForArchive)
    {
        EventId = eventId;
        MarkedForArchive = markedForArchive;
    }

    public Guid EventId { get; }
    public bool MarkedForArchive { get; }
}
