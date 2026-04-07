using Dapper;
using Microsoft.Extensions.Configuration;
using Npgsql;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Repository.Repositories.Update;

public interface ITimeOfDayWriteRepository
{
    Task<TimeOfDayDomain> UpsertAsync(TimeOfDayDomain domain);
    Task UpdateCursorAsync(Guid campaignId, decimal positionPercent);
    Task UpdateSlicePlayerNotesAsync(Guid sliceId, string playerNotes);
    Task UpdateSliceDmNotesAsync(Guid sliceId, string dmNotes);
}

public class TimeOfDayWriteRepository(
    IConfiguration configuration,
    ILoggingService logging,
    ICorrelationContext correlation) : ITimeOfDayWriteRepository
{
    private NpgsqlConnection CreateConnection() =>
        new(configuration.GetConnectionString("DefaultConnection"));

    public async Task<TimeOfDayDomain> UpsertAsync(TimeOfDayDomain domain)
    {
        var spanId = correlation.NewSpan();
        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_time_of_day",
            new { domain.CampaignId });

        using var conn = CreateConnection();

        // Upsert the header row
        var tod = await conn.QueryFirstAsync<dynamic>(
            @"INSERT INTO campaign_time_of_day (campaign_id, day_length_hours, cursor_position_percent, updated_at)
              VALUES (@CampaignId, @DayLengthHours, @CursorPositionPercent, NOW())
              ON CONFLICT (campaign_id) DO UPDATE
                SET day_length_hours        = EXCLUDED.day_length_hours,
                    cursor_position_percent = EXCLUDED.cursor_position_percent,
                    updated_at              = NOW()
              RETURNING id, campaign_id, day_length_hours, cursor_position_percent",
            new
            {
                domain.CampaignId,
                domain.DayLengthHours,
                domain.CursorPositionPercent,
            });

        // Replace all slices: delete existing, insert new
        await conn.ExecuteAsync(
            "DELETE FROM campaign_tod_slices WHERE campaign_id = @CampaignId",
            new { domain.CampaignId });

        var insertedSlices = new List<TimeOfDaySliceDomain>();
        for (var i = 0; i < domain.Slices.Count; i++)
        {
            var slice = domain.Slices[i];
            var row = await conn.QueryFirstAsync<dynamic>(
                @"INSERT INTO campaign_tod_slices
                    (campaign_id, label, color, duration_hours, sort_order, dm_notes, player_notes)
                  VALUES (@CampaignId, @Label, @Color, @DurationHours, @SortOrder, @DmNotes, @PlayerNotes)
                  RETURNING id, campaign_id, label, color, duration_hours, sort_order, dm_notes, player_notes",
                new
                {
                    domain.CampaignId,
                    slice.Label,
                    slice.Color,
                    slice.DurationHours,
                    SortOrder  = i,
                    slice.DmNotes,
                    slice.PlayerNotes,
                });

            insertedSlices.Add(new TimeOfDaySliceDomain
            {
                Id            = row.id,
                CampaignId    = row.campaign_id,
                Label         = row.label,
                Color         = row.color,
                DurationHours = row.duration_hours,
                SortOrder     = row.sort_order,
                DmNotes       = row.dm_notes ?? string.Empty,
                PlayerNotes   = row.player_notes ?? string.Empty,
            });
        }

        logging.LogDbOperation(correlation.TraceId, spanId, "UPSERT", "campaign_time_of_day",
            new { domain.CampaignId }, 1);

        return new TimeOfDayDomain
        {
            Id                    = tod.id,
            CampaignId            = tod.campaign_id,
            DayLengthHours        = tod.day_length_hours,
            CursorPositionPercent = tod.cursor_position_percent,
            Slices                = insertedSlices,
        };
    }

    public async Task UpdateCursorAsync(Guid campaignId, decimal positionPercent)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { CampaignId = campaignId, PositionPercent = positionPercent };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_time_of_day", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_time_of_day
              SET cursor_position_percent = @PositionPercent, updated_at = NOW()
              WHERE campaign_id = @CampaignId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_time_of_day", @params, rows);
    }

    public async Task UpdateSlicePlayerNotesAsync(Guid sliceId, string playerNotes)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { SliceId = sliceId, PlayerNotes = playerNotes };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_tod_slices", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_tod_slices
              SET player_notes = @PlayerNotes, updated_at = NOW()
              WHERE id = @SliceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_tod_slices", @params, rows);
    }

    public async Task UpdateSliceDmNotesAsync(Guid sliceId, string dmNotes)
    {
        var spanId  = correlation.NewSpan();
        var @params = new { SliceId = sliceId, DmNotes = dmNotes };

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_tod_slices", @params);

        using var conn = CreateConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE campaign_tod_slices
              SET dm_notes = @DmNotes, updated_at = NOW()
              WHERE id = @SliceId",
            @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_tod_slices", @params, rows);
    }
}
