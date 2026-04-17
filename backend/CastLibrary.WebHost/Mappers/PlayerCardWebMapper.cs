using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;

public interface IPlayerCardWebMapper
{
    PlayerCardResponse ToResponse(PlayerCardDomain domain, List<PlayerCardConditionDomain>? conditions = null);
    PlayerCardMemoryResponse ToResponse(PlayerCardMemoryDomain domain);
    PlayerCardTraitResponse ToResponse(PlayerCardTraitDomain domain);
    PlayerCardSecretResponse ToResponse(PlayerCardSecretDomain domain);
    PlayerCastPerceptionResponse ToResponse(PlayerCastPerceptionDomain domain);
}

public class PlayerCardWebMapper(
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCardWebMapper
{
    private const string Ns = "CastLibrary.WebHost.Mappers";

    public PlayerCardResponse ToResponse(PlayerCardDomain domain, List<PlayerCardConditionDomain>? conditions = null)
    {
        var response = new PlayerCardResponse
        {
            Id = domain.Id,
            CampaignId = domain.CampaignId,
            PlayerUserId = domain.PlayerUserId,
            Name = domain.Name,
            Race = domain.Race,
            Class = domain.Class,
            Description = domain.Description,
            ImageUrl = domain.ImageUrl,
            Conditions = (conditions ?? []).Select(c => new PlayerCardConditionResponse
            {
                Id = c.Id,
                PlayerCardId = c.PlayerCardId,
                ConditionName = c.ConditionName,
                AssignedAt = c.AssignedAt,
            }).ToList(),
            CurrencyBalances = domain.CurrencyBalances
                .Select(kv => new CurrencyBalanceResponse(kv.Key, kv.Value))
                .ToList(),
            CreatedAt = domain.CreatedAt,
            UpdatedAt = domain.UpdatedAt,
        };

        logging.LogMapping(correlation.TraceId, correlation.SpanId, Ns, "PlayerCardWebMapper.ToResponse", "domain→response", domain, response);
        return response;
    }

    public PlayerCardMemoryResponse ToResponse(PlayerCardMemoryDomain domain)
    {
        var response = new PlayerCardMemoryResponse
        {
            Id = domain.Id,
            PlayerCardId = domain.PlayerCardId,
            MemoryType = domain.MemoryType,
            SessionNumber = domain.SessionNumber,
            Title = domain.Title,
            Detail = domain.Detail,
            MemoryDate = domain.MemoryDate,
            CreatedAt = domain.CreatedAt,
        };

        logging.LogMapping(correlation.TraceId, correlation.SpanId, Ns, "PlayerCardWebMapper.ToResponse(Memory)", "domain→response", domain, response);
        return response;
    }

    public PlayerCardTraitResponse ToResponse(PlayerCardTraitDomain domain)
    {
        var response = new PlayerCardTraitResponse
        {
            Id = domain.Id,
            PlayerCardId = domain.PlayerCardId,
            TraitType = domain.TraitType,
            Content = domain.Content,
            IsCompleted = domain.IsCompleted,
            CreatedAt = domain.CreatedAt,
        };

        logging.LogMapping(correlation.TraceId, correlation.SpanId, Ns, "PlayerCardWebMapper.ToResponse(Trait)", "domain→response", domain, response);
        return response;
    }

    public PlayerCardSecretResponse ToResponse(PlayerCardSecretDomain domain)
    {
        var response = new PlayerCardSecretResponse
        {
            Id = domain.Id,
            PlayerCardId = domain.PlayerCardId,
            Content = domain.Content,
            IsShared = domain.IsShared,
            SharedAt = domain.SharedAt,
            SharedBy = domain.SharedBy,
            CreatedAt = domain.CreatedAt,
        };

        logging.LogMapping(correlation.TraceId, correlation.SpanId, Ns, "PlayerCardWebMapper.ToResponse(Secret)", "domain→response", domain, response);
        return response;
    }

    public PlayerCastPerceptionResponse ToResponse(PlayerCastPerceptionDomain domain)
    {
        var response = new PlayerCastPerceptionResponse
        {
            Id = domain.Id,
            PlayerCardId = domain.PlayerCardId,
            CastInstanceId = domain.CastInstanceId,
            LocationInstanceId = domain.LocationInstanceId,
            SublocationInstanceId = domain.SublocationInstanceId,
            Impression = domain.Impression,
            CreatedAt = domain.CreatedAt,
            UpdatedAt = domain.UpdatedAt,
        };

        logging.LogMapping(correlation.TraceId, correlation.SpanId, Ns, "PlayerCardWebMapper.ToResponse(Perception)", "domain→response", domain, response);
        return response;
    }
}
