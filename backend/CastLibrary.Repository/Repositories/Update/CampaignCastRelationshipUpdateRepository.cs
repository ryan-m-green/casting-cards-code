using CastLibrary.Logic.Interfaces;
using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using Dapper;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Text;

namespace CastLibrary.Repository.Repositories.Update
{
    public interface ICampaignCastRelationshipUpdateRepository
    {
        Task UpdateAsync(CampaignCastRelationshipDomain domain);
    }
    public class CampaignCastRelationshipUpdateRepository(
    ISqlConnectionFactory connectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ICampaignCastRelationshipUpdateRepository
    {
        public async Task UpdateAsync(CampaignCastRelationshipDomain domain)
        {
            var spanId = correlation.NewSpan();
            var @params = new
            {
                domain.Id,
                domain.Value,
                domain.Explanation,
                domain.UpdatedAt,
            };
            const string sql =
                @"UPDATE campaign_cast_relationships
              SET value = @Value, explanation = @Explanation, updated_at = @UpdatedAt
              WHERE id = @Id";

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_relationships", @params);

            using var conn = connectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync(sql, @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_cast_relationships", @params, rows);
        }
    }
}
