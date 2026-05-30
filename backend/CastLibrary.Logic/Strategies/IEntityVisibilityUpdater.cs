using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Strategies
{
    public static class EntityTypes
    {
        public const string Cast = "cast";
        public const string TimeOfDay = "time-of-day";
        public const string Faction = "faction";
        public const string Location = "location";
        public const string Sublocation = "sublocation";
        public const string Campaign = "campaign-event";
    }
    public static class EventNames
    {
        public const string CardVisibilityChanged = "CardVisibilityChanged";
        public const string TimeOfDayCursorMoved = "TimeCursorMoved";
    }

    public interface IEntityVisibilityUpdater
    {
        bool IsMatch(EntityVisibility entityVisibility);
        Task<EntityVisibilityResult> Update(Guid campaignId, EntityVisibility entityVisibility);
    }

    public class CampaignEntityVisibilityUpdater(IStorylineUpdateRepository storylineUpdateRepository, IStorylineReadRepository storylineReadRepository) : IEntityVisibilityUpdater
    {
        public bool IsMatch(EntityVisibility entityVisibility)
        {
            return entityVisibility.EntityType.ToLower() == EntityTypes.Campaign;
        }
        public async Task<EntityVisibilityResult> Update(Guid campaignId, EntityVisibility entityVisibility)
        {
            await storylineUpdateRepository.UpdateVisibilityAsync(entityVisibility.EntityId, entityVisibility.IsVisible);

            // Fetch event details to include in SignalR message
            var campaignEvent = await storylineReadRepository.GetByIdAsync(entityVisibility.EntityId);

            return new EntityVisibilityResult()
            {
                CampaignId = campaignId,
                EventName = EventNames.CardVisibilityChanged,
                IsVisible = entityVisibility.IsVisible,
                EntityInstanceId = entityVisibility.EntityId,
                CardType = EntityTypes.Campaign,
                Title = campaignEvent?.Title,
                Body = campaignEvent?.Body
            };
        }
    }

    public class SublocationEntityVisibilityUpdater(ICampaignUpdateRepository campaignUpdateRepository) : IEntityVisibilityUpdater
    {
        public bool IsMatch(EntityVisibility entityVisibility)
        {
            return entityVisibility.EntityType.ToLower() == EntityTypes.Sublocation;
        }
        public async Task<EntityVisibilityResult> Update(Guid campaignId, EntityVisibility entityVisibility)
        {
            await campaignUpdateRepository.UpdateSublocationInstanceVisibilityAsync(entityVisibility.EntityId, entityVisibility.IsVisible);
            return new EntityVisibilityResult()
            {
                CampaignId = campaignId,
                EventName = EventNames.CardVisibilityChanged,
                IsVisible = entityVisibility.IsVisible,
                EntityInstanceId = entityVisibility.EntityId,
                CardType = EntityTypes.Sublocation
            };
        }
    }

    public class LocationEntityVisibilityUpdater(ICampaignUpdateRepository campaignUpdateRepository) : IEntityVisibilityUpdater
    {
        public bool IsMatch(EntityVisibility entityVisibility)
        {
            return entityVisibility.EntityType.ToLower() == EntityTypes.Location;
        }
        public async Task<EntityVisibilityResult> Update(Guid campaignId, EntityVisibility entityVisibility)
        {
            await campaignUpdateRepository.UpdateLocationInstanceVisibilityAsync(entityVisibility.EntityId, entityVisibility.IsVisible);
            return new EntityVisibilityResult()
            {
                CampaignId = campaignId,
                EventName = EventNames.CardVisibilityChanged,
                IsVisible = entityVisibility.IsVisible,
                EntityInstanceId = entityVisibility.EntityId,
                CardType = EntityTypes.Location
            };
        }
    }

    public class FactionEntityVisibilityUpdater(ICampaignUpdateRepository campaignUpdateRepository) : IEntityVisibilityUpdater
    {
        public bool IsMatch(EntityVisibility entityVisibility)
        {
            return entityVisibility.EntityType.ToLower() == EntityTypes.Faction;
        }

        public async Task<EntityVisibilityResult> Update(Guid campaignId, EntityVisibility entityVisibility)
        {
            await campaignUpdateRepository.UpdateFactionInstanceVisibilityAsync(entityVisibility.EntityId, entityVisibility.IsVisible);
            return new EntityVisibilityResult()
            {
                CampaignId = campaignId,
                EventName = EventNames.CardVisibilityChanged,
                IsVisible = entityVisibility.IsVisible,
                EntityInstanceId = entityVisibility.EntityId,
                CardType = EntityTypes.Faction
            };
        }
    }

    public class CastEntityVisibilityUpdater(ICampaignUpdateRepository campaignUpdateRepository) : IEntityVisibilityUpdater
    {
        public bool IsMatch(EntityVisibility entityVisibility)
        {
            return entityVisibility.EntityType.ToLower() == EntityTypes.Cast;
        }

        public async Task<EntityVisibilityResult> Update(Guid campaignId, EntityVisibility entityVisibility)
        {
            await campaignUpdateRepository.UpdateCastInstanceVisibilityAsync(entityVisibility.EntityId, entityVisibility.IsVisible);
            return new EntityVisibilityResult()
            {
                CampaignId = campaignId,
                EventName = EventNames.CardVisibilityChanged,
                EntityInstanceId = entityVisibility.EntityId,
                IsVisible = entityVisibility.IsVisible,
                CardType = EntityTypes.Cast
            };
        }
    }

    public class TimeOfDayEntityVisibilityUpdater(ITimeOfDayWriteRepository timeOfDayRepo) : IEntityVisibilityUpdater
    {
        public bool IsMatch(EntityVisibility entityVisibility)
        {
            return entityVisibility.EntityType.ToLower() == EntityTypes.TimeOfDay 
                && entityVisibility.TodPositionPercent.HasValue;
        }

        public async Task<EntityVisibilityResult> Update(Guid campaignId, EntityVisibility entityVisibility)
        {
            var result = new EntityVisibilityResult();

            var clamped = Math.Max(0m, Math.Min(100m, entityVisibility.TodPositionPercent.Value));
            await timeOfDayRepo.UpdateCursorAsync(campaignId, clamped);

            return new EntityVisibilityResult()
            {
                CampaignId = campaignId,
                PositionPercentMoved = clamped,
                EntityInstanceId = entityVisibility.EntityId,
                EventName = EventNames.TimeOfDayCursorMoved,
                IsVisible = entityVisibility.IsVisible,
                CardType = EntityTypes.TimeOfDay
            };
        }
    }


}
