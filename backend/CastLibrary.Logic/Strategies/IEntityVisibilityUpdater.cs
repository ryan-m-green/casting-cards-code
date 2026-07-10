using CastLibrary.Logic.Commands.Campaign;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
using ImageMagick;
using Microsoft.Extensions.DependencyInjection;

namespace CastLibrary.Logic.Strategies
{
    public static class EntityTypes
    {
        public const string Cast = "cast";
        public const string TimeOfDay = "time-of-day";
        public const string Faction = "faction";
        public const string Location = "location";
        public const string Sublocation = "sublocation";
        public const string CampaignEvent = "campaign-event";
        public const string CampaignHandout = "campaign-handout";
        public const string Player = "player";
        public const string Secret = "secret";
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

    public class PlayerEntityVisibilityUpdater(ICampaignPlayerReadRepository playerReadRepository) : IEntityVisibilityUpdater
    {
        public bool IsMatch(EntityVisibility entityVisibility)
        {
            return entityVisibility.EntityType.ToLower() == EntityTypes.Player;
        }

        public async Task<EntityVisibilityResult> Update(Guid campaignId, EntityVisibility entityVisibility)
        {
            // Fetch player card data to include in SignalR message
            var players = await playerReadRepository.GetByCampaignAsync(campaignId);
            var player = players.FirstOrDefault(p => p.UserId == entityVisibility.EntityId);

            return new EntityVisibilityResult()
            {
                CampaignId = campaignId,
                EventName = EventNames.CardVisibilityChanged,
                IsVisible = entityVisibility.IsVisible,
                EntityInstanceId = entityVisibility.EntityId,
                CardType = EntityTypes.Player,
                PlayerCardName = player?.PlayerCardName,
                PlayerCardRace = player?.PlayerCardRace,
                PlayerCardClass = player?.PlayerCardClass,
                PlayerCardImageUrl = player?.ImageUrl
            };
        }
    }

    public class CampaignEntityVisibilityUpdater(IStorylineUpdateRepository storylineUpdateRepository, IStorylineReadRepository storylineReadRepository) : IEntityVisibilityUpdater
    {
        public bool IsMatch(EntityVisibility entityVisibility)
        {
            return entityVisibility.EntityType.ToLower() == EntityTypes.CampaignEvent ||
                   entityVisibility.EntityType.ToLower() == EntityTypes.CampaignHandout;
        }
        public async Task<EntityVisibilityResult> Update(Guid campaignId, EntityVisibility entityVisibility)
        {
            await storylineUpdateRepository.UpdateVisibilityAsync(entityVisibility.EntityId, entityVisibility.IsVisible);

            // Fetch event details to include in SignalR message
            var campaignEvent = await storylineReadRepository.GetByIdAsync(entityVisibility.EntityId);

            var body = campaignEvent.SceneType == EntityTypes.CampaignHandout
                ? "A handout is now available for viewing"
                : campaignEvent.Body ?? "A scene is now available for viewing";

            return new EntityVisibilityResult()
            {
                CampaignId = campaignId,
                EventName = EventNames.CardVisibilityChanged,
                IsVisible = entityVisibility.IsVisible,
                EntityInstanceId = entityVisibility.EntityId,
                CardType = entityVisibility.EntityType,
                Title = campaignEvent.Title,
                Body = body
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

    public class SecretEntityVisibilityUpdater : IEntityVisibilityUpdater
    {
        private readonly ISecretUpdateRepository _secretUpdateRepository;
        private readonly ISecretReadRepository _secretReadRepository;
        private readonly IServiceProvider _serviceProvider;

        private readonly IEnumerable<string> _allowedEntityTypes = new List<string>()
        {
            EntityTypes.Cast, EntityTypes.Sublocation, EntityTypes.Location
        };

        public SecretEntityVisibilityUpdater(ISecretUpdateRepository secretUpdateRepository,
            ISecretReadRepository secretReadRepository,
            IServiceProvider serviceProvider)
        {
            _secretUpdateRepository = secretUpdateRepository;
            _secretReadRepository = secretReadRepository;
            _serviceProvider = serviceProvider;
        }

        private IEnumerable<IEntityVisibilityUpdater> GetEntityVisibilityUpdaters()
        {
            var updaters = _serviceProvider.GetServices<IEntityVisibilityUpdater>();
            return updaters.Where(updater =>
                _allowedEntityTypes.Any(entityType =>
                    updater.IsMatch(new EntityVisibility { EntityType = entityType }))
            ).ToList();
        }

        public bool IsMatch(EntityVisibility entityVisibility)
        {
            return entityVisibility.EntityType.ToLower() == EntityTypes.Secret;
        }

        public async Task<EntityVisibilityResult> Update(Guid campaignId, EntityVisibility entityVisibility)
        {
            var secretId = entityVisibility.EntityId;
            var secret = await _secretReadRepository.GetByIdAsync(secretId);
            if (secret is null || secret.CampaignId != campaignId)
            {
                // Secret not found or belongs to different campaign, don't update
                return new EntityVisibilityResult()
                {
                    CampaignId = campaignId,
                    EntityInstanceId = secretId,
                    EventName = EventNames.CardVisibilityChanged,
                    IsVisible = false,
                    CardType = EntityTypes.Secret
                };
            }

            if (entityVisibility.IsVisible)
            {
                await _secretUpdateRepository.RevealAsync(secretId, DateTime.UtcNow);

                // Auto-unlock associated card if it's still hidden
                if (secret.CastInstanceId.HasValue)
                {
                    var updater = GetEntityVisibilityUpdaters().FirstOrDefault(u => u.IsMatch(new EntityVisibility { EntityType = EntityTypes.Cast }));
                    if (updater != null)
                    {
                        await updater.Update(campaignId, new EntityVisibility
                        {
                            EntityType = EntityTypes.Cast,
                            EntityId = secret.CastInstanceId.Value,
                            IsVisible = true
                        });
                    }
                }
                else if (secret.LocationInstanceId.HasValue)
                {
                    var updater = GetEntityVisibilityUpdaters().FirstOrDefault(u => u.IsMatch(new EntityVisibility { EntityType = EntityTypes.Location }));
                    if (updater != null)
                    {
                        await updater.Update(campaignId, new EntityVisibility
                        {
                            EntityType = EntityTypes.Location,
                            EntityId = secret.LocationInstanceId.Value,
                            IsVisible = true
                        });
                    }
                }
                else if (secret.SublocationInstanceId.HasValue)
                {
                    var updater = GetEntityVisibilityUpdaters().FirstOrDefault(u => u.IsMatch(new EntityVisibility { EntityType = EntityTypes.Sublocation }));
                    if (updater != null)
                    {
                        await updater.Update(campaignId, new EntityVisibility
                        {
                            EntityType = EntityTypes.Sublocation,
                            EntityId = secret.SublocationInstanceId.Value,
                            IsVisible = true
                        });
                    }
                }
            }
            else
            {
                await _secretUpdateRepository.ResealAsync(secretId);
            }

            return new EntityVisibilityResult()
            {
                CampaignId = campaignId,
                EntityInstanceId = secretId,
                EventName = EventNames.CardVisibilityChanged,
                IsVisible = entityVisibility.IsVisible,
                CardType = EntityTypes.Secret
            };
        }
    }


}
