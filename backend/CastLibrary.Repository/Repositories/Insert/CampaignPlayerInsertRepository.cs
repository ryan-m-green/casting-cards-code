using CastLibrary.Logic.Interfaces;
using Dapper;
using System;
using System.Collections.Generic;
using System.Text;

namespace CastLibrary.Repository.Repositories.Insert
{
    public interface ICampaignPlayerInsertRepository
    {
        Task InsertCampaignPlayerAsync(Guid campaignId, Guid playerUserId);
    }
    public class CampaignPlayerInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignPlayerInsertRepository
    {
        public async Task InsertCampaignPlayerAsync(Guid campaignId, Guid playerUserId)
        {
            var spanId = correlation.NewSpan();
            var @params = new { CampaignId = campaignId, PlayerUserId = playerUserId };
            const string sql =
                @"INSERT INTO campaign_players (campaign_id, player_user_id)
              VALUES (@CampaignId, @PlayerUserId)
              ON CONFLICT DO NOTHING";

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_players", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "campaign_players", @params, 1);
        }
    }
}
