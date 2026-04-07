using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Repository.Repositories.Read;

public interface ITimeOfDayReadRepository
{
    Task<TimeOfDayDomain?> GetByCampaignIdAsync(Guid campaignId);
}

public class TimeOfDayReadRepository(
    IConfiguration configuration,
    ILoggingService logging,
    ICorrelationContext correlation) : ITimeOfDayReadRepository
{
    private NpgsqlConnection CreateConnection() =>
        new(configuration.GetConnectionString("DefaultConnection"));

    public async Task<TimeOfDayDomain?> GetByCampaignIdAsync(Guid campaignId)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId };

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_time_of_day", @params);

        using var conn = CreateConnection();

        var tod = await conn.QueryFirstOrDefaultAsync<dynamic>(
            @"SELECT id, campaign_id, day_length_hours, cursor_position_percent
              FROM campaign_time_of_day
              WHERE campaign_id = @CampaignId",
            @params);

        if (tod is null)
        {
            logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_time_of_day", @params, 0);
            return null;
        }

        var slices = (await conn.QueryAsync<dynamic>(
            @"SELECT id, campaign_id, label, color, duration_hours, sort_order, dm_notes, player_notes
              FROM campaign_tod_slices
              WHERE campaign_id = @CampaignId
              ORDER BY sort_order",
            @params)).ToList();

        logging.LogDbOperation(correlation.TraceId, spanId, "SELECT", "campaign_time_of_day", @params, 1);

        return new TimeOfDayDomain
        {
            Id                    = tod.id,
            CampaignId            = tod.campaign_id,
            DayLengthHours        = tod.day_length_hours,
            CursorPositionPercent = tod.cursor_position_percent,
            Slices = slices.Select(s => new TimeOfDaySliceDomain
            {
                Id            = s.id,
                CampaignId    = s.campaign_id,
                Label         = s.label ?? string.Empty,
                Color         = s.color ?? string.Empty,
                DurationHours = s.duration_hours,
                SortOrder     = s.sort_order,
                DmNotes       = s.dm_notes ?? string.Empty,
                PlayerNotes   = s.player_notes ?? string.Empty,
            }).ToList(),
        };
    }
}
