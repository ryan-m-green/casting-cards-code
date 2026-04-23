using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Responses;

namespace CastLibrary.WebHost.Mappers;


public interface ICampaignWebMapper
{
    CampaignListResponse ToListResponse(CampaignDomain domain);
    CampaignLocationInstanceResponse ToLocationInstanceResponse(CampaignLocationInstanceDomain d);
    CampaignCastInstanceResponse ToCastInstanceResponse(CampaignCastInstanceDomain d);
    CampaignSublocationInstanceResponse ToSublocationInstanceResponse(CampaignSublocationInstanceDomain d);
    CampaignSecretResponse ToSecretResponse(CampaignSecretDomain d);
    CampaignCastRelationshipResponse ToRelationshipResponse(CampaignCastRelationshipDomain d);
    CampaignPlayerResponse ToPlayerResponse(CampaignPlayerDomain d);
    CampaignInviteCodeResponse ToInviteCodeResponse(CampaignInviteCodeDomain d);
    TimeOfDayResponse ToTimeOfDayResponse(TimeOfDayDomain d);
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
            LocationCount = domain.LocationCount,
            PlayerCount = domain.PlayerCount,
            CreatedAt = domain.CreatedAt,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToListResponse",
            "domain?response",
            domain, response);

        return response;
    }

    public CampaignLocationInstanceResponse ToLocationInstanceResponse(CampaignLocationInstanceDomain d)
    {
        var response = new CampaignLocationInstanceResponse
        {
            InstanceId = d.InstanceId,
            CampaignId = d.CampaignId,
            SourceLocationId = d.SourceLocationId,
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
            Ns, "CampaignWebMapper.ToLocationInstanceResponse",
            "domain?response",
            d, response);

        return response;
    }

    public CampaignCastInstanceResponse ToCastInstanceResponse(CampaignCastInstanceDomain d)
    {
        var response = new CampaignCastInstanceResponse
        {
            InstanceId = d.InstanceId,
            CampaignId = d.CampaignId,
            SourceCastId = d.SourceCastId,
            LocationInstanceId = d.LocationInstanceId,
            SublocationInstanceId = d.SublocationInstanceId,
            Name = d.Name,
            Pronouns = d.Pronouns,
            Race = d.Race,
            Role = d.Role,
            Age = d.Age,
            Alignment = d.Alignment,
            Posture = d.Posture,
            Speed = d.Speed,
            VoicePlacement = d.VoicePlacement,
            Description = d.Description,
            PublicDescription = d.PublicDescription,
            IsVisibleToPlayers = d.IsVisibleToPlayers,
            ImageUrl = d.ImageUrl,
            CustomItems = d.CustomItems
                                  .Select(i => new CampaignCastCustomItemResponse(i.Name, i.Price))
                                  .ToList(),
            Keywords = d.Keywords,
            DmNotes = d.DmNotes,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToCastInstanceResponse",
            "domain?response",
            d, response);

        return response;
    }

    public CampaignSublocationInstanceResponse ToSublocationInstanceResponse(CampaignSublocationInstanceDomain d)
    {
        var response = new CampaignSublocationInstanceResponse
        {
            InstanceId = d.InstanceId,
            CampaignId = d.CampaignId,
            SourceSublocationId = d.SourceSublocationId,
            LocationInstanceId = d.LocationInstanceId,
            Name = d.Name,
            Description = d.Description,
            ImageUrl = d.ImageUrl,
            IsVisibleToPlayers = d.IsVisibleToPlayers,
            DmNotes = d.DmNotes,
            ShopItems = d.ShopItems.Select(s => new ShopItemResponse
            {
                Id = s.Id,
                Name = s.Name,
                Price = s.Price,
                Description = s.Description,
                IsScratchedOff = s.IsScratchedOff,
            }).ToList(),
            CustomItems = d.CustomItems
                           .Select(i => new CampaignCastCustomItemResponse(i.Name, i.Price))
                           .ToList(),
            Keywords = d.Keywords,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToSublocationInstanceResponse",
            "domain?response",
            d, response);

        return response;
    }

    public CampaignSecretResponse ToSecretResponse(CampaignSecretDomain d)
    {
        var response = new CampaignSecretResponse
        {
            Id = d.Id,
            CampaignId = d.CampaignId,
            CastInstanceId = d.CastInstanceId,
            LocationInstanceId = d.LocationInstanceId,
            SublocationInstanceId = d.SublocationInstanceId,
            Content = d.Content,
            SortOrder = d.SortOrder,
            IsRevealed = d.IsRevealed,
            RevealedAt = d.RevealedAt,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToSecretResponse",
            "domain?response",
            d, response);

        return response;
    }

    public CampaignCastRelationshipResponse ToRelationshipResponse(CampaignCastRelationshipDomain d)
    {
        var response = new CampaignCastRelationshipResponse
        {
            Id = d.Id,
            CampaignId = d.CampaignId,
            SourceCastInstanceId = d.SourceCastInstanceId,
            TargetCastInstanceId = d.TargetCastInstanceId,
            Value = d.Value,
            Explanation = d.Explanation,
            CreatedAt = d.CreatedAt,
            UpdatedAt = d.UpdatedAt,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToRelationshipResponse",
            "domain?response",
            d, response);

        return response;
    }

    public CampaignPlayerResponse ToPlayerResponse(CampaignPlayerDomain d)
    {
        var response = new CampaignPlayerResponse
        {
            UserId = d.UserId,
            DisplayName = d.DisplayName,
            Email = d.Email,
            StartingGold = d.StartingGold,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToPlayerResponse",
            "domain?response",
            d, response);

        return response;
    }

    public CampaignInviteCodeResponse ToInviteCodeResponse(CampaignInviteCodeDomain d)
    {
        var response = new CampaignInviteCodeResponse
        {
            Code = d.Code,
            ExpiresAt = d.ExpiresAt,
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToInviteCodeResponse",
            "domain?response",
            d, response);

        return response;
    }

    public TimeOfDayResponse ToTimeOfDayResponse(TimeOfDayDomain d)
    {
        var total = d.Slices.Sum(s => s.DurationHours);
        decimal running = 0;

        var response = new TimeOfDayResponse
        {
            Id = d.Id,
            CampaignId = d.CampaignId,
            DayLengthHours = d.DayLengthHours,
            CursorPositionPercent = d.CursorPositionPercent,
            DaysPassed = d.DaysPassed,
            Slices = d.Slices.Select(s =>
            {
                var start = total > 0 ? running / total * 100 : 0;
                running += s.DurationHours;
                var end = total > 0 ? running / total * 100 : 0;
                return new TimeOfDaySliceResponse
                {
                    Id = s.Id,
                    Label = s.Label,
                    Color = s.Color,
                    DurationHours = s.DurationHours,
                    StartPercent = Math.Round(start, 4),
                    EndPercent = Math.Round(end, 4),
                    DmNotes = s.DmNotes,
                    PlayerNotes = s.PlayerNotes,
                };
            }).ToList(),
        };

        logging.LogMapping(
            correlation.TraceId, correlation.SpanId,
            Ns, "CampaignWebMapper.ToTimeOfDayResponse",
            "domain?response",
            d, response);

        return response;
    }
}



