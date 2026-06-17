using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Services
{
    public interface IImageKeyCreator
    {
        string Create(Guid dmUserId, Guid campaignId, Guid entityId, EntityType entityType);
    }
    public class ImageKeyCreator : IImageKeyCreator
    {
        public string Create(Guid dmUserId, Guid campaignId, Guid entityId, EntityType entityType)
        {
            switch (entityType)
            {
                case EntityType.Cast:
                    return $"{dmUserId}/casts/{entityId}.png";
                case EntityType.Sublocation:
                    return $"{dmUserId}/sublocations/{entityId}.png";
                case EntityType.Location:
                    return $"{dmUserId}/locations/{entityId}.png";
                case EntityType.PlayerCard:
                    return $"{dmUserId}/campaigns/{campaignId}/player-cards/{entityId}.png";
                case EntityType.Faction:
                    return $"{dmUserId}/factions/{entityId}.png";
                case EntityType.CampaignHandout:
                    return $"{dmUserId}/campaigns/{campaignId}/handouts/{entityId}.png";
                default: return string.Empty;
            }
        }
    }
}


