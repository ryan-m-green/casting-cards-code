using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;


public interface ICampaignWebMapper
{
    CampaignListResponse ToListResponse(CampaignDomain domain);
    CampaignCityInstanceResponse ToCityInstanceResponse(CampaignCityInstanceDomain d);
    CampaignCastInstanceResponse ToCastInstanceResponse(CampaignCastInstanceDomain d);
    CampaignLocationInstanceResponse ToLocationInstanceResponse(CampaignLocationInstanceDomain d);
    CampaignSecretResponse ToSecretResponse(CampaignSecretDomain d);
    CampaignCastRelationshipResponse ToRelationshipResponse(CampaignCastRelationshipDomain d);
    CampaignPlayerResponse ToPlayerResponse(CampaignPlayerDomain d);
    CampaignInviteCodeResponse ToInviteCodeResponse(CampaignInviteCodeDomain d);
}
/// <summary>
/// Maps Campaign-related domain objects to API response objects.
/// All formerly-static methods are now instance methods so that
/// ILoggingService and ICorrelationContext can be used for structured logging.
/// Logs every transformation with OTel-compatible structured entries.
/// </summary>
public class CampaignWebMapper(
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignWebMapper
{
    private const string Ns = "CastLibrary.WebHost.Mappers";

    public CampaignListResponse ToListResponse(CampaignDomain domain)
    {
        var response = new CampaignListResponse
        {
            Id = domain.Id,
            Name = domain.Name,
            FantasyType = domain.FantasyType,
            Status = domain.Status.ToString(),
            SpineColor = domain.SpineColor,
            CityCount = domain.CityCount,
            PlayerCount = domain.PlayerCount,
            CreatedAt = domain.CreatedAt,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToListResponse",
            "domain→response",
            domain, response);

        return response;
    }

    public CampaignCityInstanceResponse ToCityInstanceResponse(CampaignCityInstanceDomain d)
    {
        var response = new CampaignCityInstanceResponse
        {
            InstanceId = d.InstanceId,
            CampaignId = d.CampaignId,
            SourceCityId = d.SourceCityId,
            Name = d.Name,
            Classification = d.Classification,
            Size = d.Size,
            Condition = d.Condition,
            Geography = d.Geography,
            Architecture = d.Architecture,
            Climate = d.Climate,
            Religion = d.Religion,
            Vibe = d.Vibe,
            Languages = d.Languages,
            Description = d.Description,
            ImageUrl = d.ImageUrl,
            IsVisibleToPlayers = d.IsVisibleToPlayers,
            SortOrder = d.SortOrder,
            Keywords = d.Keywords,
            DmNotes = d.DmNotes,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToCityInstanceResponse",
            "domain→response",
            d, response);

        return response;
    }

    public CampaignCastInstanceResponse ToCastInstanceResponse(CampaignCastInstanceDomain d)
    {
        var response = new CampaignCastInstanceResponse
        {
            InstanceId         = d.InstanceId,
            CampaignId         = d.CampaignId,
            SourceCastId       = d.SourceCastId,
            CityInstanceId     = d.CityInstanceId,
            LocationInstanceId = d.LocationInstanceId,
            Name              = d.Name,
            Pronouns          = d.Pronouns,
            Race              = d.Race,
            Role              = d.Role,
            Age               = d.Age,
            Alignment         = d.Alignment,
            Posture           = d.Posture,
            Speed             = d.Speed,
            VoicePlacement    = d.VoicePlacement,
            Description       = d.Description,
            PublicDescription = d.PublicDescription,
            IsVisibleToPlayers = d.IsVisibleToPlayers,
            CustomItems = d.CustomItems
                                  .Select(i => new CampaignCastCustomItemResponse(i.Name, i.Price))
                                  .ToList(),
            Keywords = d.Keywords,
            DmNotes  = d.DmNotes,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToCastInstanceResponse",
            "domain→response",
            d, response);

        return response;
    }

    public CampaignLocationInstanceResponse ToLocationInstanceResponse(CampaignLocationInstanceDomain d)
    {
        var response = new CampaignLocationInstanceResponse
        {
            InstanceId         = d.InstanceId,
            CampaignId         = d.CampaignId,
            SourceLocationId   = d.SourceLocationId,
            CityInstanceId     = d.CityInstanceId,
            Name               = d.Name,
            Description        = d.Description,
            ImagePath          = d.ImageUrl,
            IsVisibleToPlayers = d.IsVisibleToPlayers,
            DmNotes            = d.DmNotes,
            ShopItems        = d.ShopItems.Select(s => new ShopItemResponse
            {
                Id            = s.Id,
                Name          = s.Name,
                Price         = s.Price,
                Description   = s.Description,
                IsScratchedOff = s.IsScratchedOff,
            }).ToList(),
            CustomItems = d.CustomItems
                           .Select(i => new CampaignCastCustomItemResponse(i.Name, i.Price))
                           .ToList(),
            Keywords = d.Keywords,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToLocationInstanceResponse",
            "domain→response",
            d, response);

        return response;
    }

    public CampaignSecretResponse ToSecretResponse(CampaignSecretDomain d)
    {
        var response = new CampaignSecretResponse
        {
            Id                 = d.Id,
            CampaignId         = d.CampaignId,
            CastInstanceId     = d.CastInstanceId,
            CityInstanceId     = d.CityInstanceId,
            LocationInstanceId = d.LocationInstanceId,
            Content            = d.Content,
            SortOrder          = d.SortOrder,
            IsRevealed         = d.IsRevealed,
            RevealedAt         = d.RevealedAt,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToSecretResponse",
            "domain→response",
            d, response);

        return response;
    }

    public CampaignCastRelationshipResponse ToRelationshipResponse(CampaignCastRelationshipDomain d)
    {
        var response = new CampaignCastRelationshipResponse
        {
            Id                    = d.Id,
            CampaignId            = d.CampaignId,
            SourceCastInstanceId  = d.SourceCastInstanceId,
            TargetCastInstanceId  = d.TargetCastInstanceId,
            Value                 = d.Value,
            Explanation           = d.Explanation,
            CreatedAt             = d.CreatedAt,
            UpdatedAt             = d.UpdatedAt,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToRelationshipResponse",
            "domain→response",
            d, response);

        return response;
    }

    public CampaignPlayerResponse ToPlayerResponse(CampaignPlayerDomain d)
    {
        var response = new CampaignPlayerResponse
        {
            UserId       = d.UserId,
            DisplayName  = d.DisplayName,
            Email        = d.Email,
            StartingGold = d.StartingGold,
            CurrentGold  = d.CurrentGold,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToPlayerResponse",
            "domain→response",
            d, response);

        return response;
    }

    public CampaignInviteCodeResponse ToInviteCodeResponse(CampaignInviteCodeDomain d)
    {
        var response = new CampaignInviteCodeResponse
        {
            Code      = d.Code,
            ExpiresAt = d.ExpiresAt,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToInviteCodeResponse",
            "domain→response",
            d, response);

        return response;
    }
}
