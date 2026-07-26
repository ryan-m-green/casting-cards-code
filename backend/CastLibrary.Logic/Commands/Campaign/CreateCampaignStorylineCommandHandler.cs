using CastLibrary.Repository.Mappers;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using System.Text.Json;
using System.Text.Json.Serialization;
using DomainEntity = CastLibrary.Shared.Domain.LinkedEntityTrigger;

namespace CastLibrary.Logic.Commands.Campaign;

public interface ICreateCampaignStorylineCommandHandler
{
    Task<CampaignStorylineDomain> HandleAsync(CreateCampaignEventCommand command);
}

public class CreateCampaignStorylineCommandHandler(
    ICampaignEventInsertRepository campaignEventRepository,
    ICampaignCastInstanceReadRepository castInstanceRepository,
    ICampaignSublocationInstanceReadRepository sublocationInstanceRepository) : ICreateCampaignStorylineCommandHandler
{
    public async Task<CampaignStorylineDomain> HandleAsync(CreateCampaignEventCommand command)
    {
        // Clean up cast-traveled entity names to store only the cast name
        // and parse travel data into CastTraveled wrapper
        var cleanedLinkedEntities = new List<DomainEntity>();
        foreach (var entity in command.Request.LinkedEntities)
        {
            if (entity.EntityType.ToLower() == "cast-traveled" && !string.IsNullOrEmpty(entity.EntityId))
            {
                var castName = await GetCastNameFromTravelDataAsync(entity.EntityId);
                var travelData = ParseCastTravelData(entity.EntityId);
                
                string fromSublocationName = string.Empty;
                string toSublocationName = string.Empty;
                
                if (travelData != null)
                {
                    if (travelData.FromSublocationInstanceId.HasValue)
                    {
                        var fromSublocation = await sublocationInstanceRepository.GetByIdAsync(travelData.FromSublocationInstanceId.Value);
                        fromSublocationName = fromSublocation?.Name ?? string.Empty;
                    }
                    
                    var toSublocation = await sublocationInstanceRepository.GetByIdAsync(travelData.ToSublocationInstanceId);
                    toSublocationName = toSublocation?.Name ?? string.Empty;
                }
                
                cleanedLinkedEntities.Add(new DomainEntity
                {
                    EntityType = entity.EntityType,
                    EntityId = travelData?.CastInstanceId.ToString() ?? entity.EntityId,
                    EntityName = string.IsNullOrEmpty(castName) ? entity.EntityName : castName,
                    VisibleToPlayers = entity.VisibleToPlayers,
                    CardMovement = travelData != null ? new CardMovementData
                    {
                        LocationInstanceId = travelData.ToLocationInstanceId,
                        FromInstanceId = travelData.FromSublocationInstanceId,
                        ToInstanceId = travelData.ToSublocationInstanceId,
                        FromSublocationName = fromSublocationName,
                        ToSublocationName = toSublocationName
                    } : new CardMovementData()
                });
            }
            else
            {
                cleanedLinkedEntities.Add(new DomainEntity
                {
                    EntityType = entity.EntityType,
                    EntityId = entity.EntityId,
                    EntityName = entity.EntityName,
                    VisibleToPlayers = entity.VisibleToPlayers
                });
            }
        }

        var domain = new CampaignStorylineDomain
        {
            Id = Guid.NewGuid(),
            CampaignId = command.CampaignId,
            Title = command.Request.Title,
            Body = command.Request.Body,
            SortOrder = 0,
            LinkedEntities = cleanedLinkedEntities,
            VisibleToPlayers = command.Request.IsVisibleToPlayers,
            SceneType = "campaign-event",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        return await campaignEventRepository.InsertAsync(domain);
    }

    private async Task<string> GetCastNameFromTravelDataAsync(string entityId)
    {
        try
        {
            var travelData = JsonSerializer.Deserialize<CastTravelTriggerData>(entityId);
            if (travelData == null)
            {
                return string.Empty;
            }

            var cast = await castInstanceRepository.GetByIdAsync(travelData.CastInstanceId);
            return cast?.Name ?? string.Empty;
        }
        catch (JsonException)
        {
            return string.Empty;
        }
    }

    private CastTravelTriggerData? ParseCastTravelData(string entityId)
    {
        try
        {
            return JsonSerializer.Deserialize<CastTravelTriggerData>(entityId);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private class CastTravelTriggerData
    {
        [JsonPropertyName("castInstanceId")]
        public Guid CastInstanceId { get; set; }

        [JsonPropertyName("toLocationInstanceId")]
        public Guid ToLocationInstanceId { get; set; }

        [JsonPropertyName("fromSublocationInstanceId")]
        public Guid? FromSublocationInstanceId { get; set; }

        [JsonPropertyName("toSublocationInstanceId")]
        public Guid ToSublocationInstanceId { get; set; }
    }
}

public class CreateCampaignEventCommand
{
    public CreateCampaignEventCommand(Guid campaignId, CreateCampaignEventRequest request)
    {
        CampaignId = campaignId;
        Request    = request;
    }

    public Guid CampaignId { get; }
    public CreateCampaignEventRequest Request { get; }
}
