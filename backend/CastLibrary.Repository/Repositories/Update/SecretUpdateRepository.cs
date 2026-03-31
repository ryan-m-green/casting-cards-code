using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;
using System;
using System.Collections.Generic;
using System.Text;

namespace CastLibrary.Repository.Repositories.Update
{
    public interface ISecretUpdateRepository
    {
        Task<CampaignSecretDomain> UpdateAsync(CampaignSecretDomain secret);
        Task RevealAsync(Guid secretId, DateTime revealedAt);
        Task ResealAsync(Guid secretId);
    }
    public class SecretUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : ISecretUpdateRepository
    {
        public async Task<CampaignSecretDomain> UpdateAsync(CampaignSecretDomain secret)
        {
            var spanId = correlation.NewSpan();
            var @params = new { secret.Id, secret.Content };

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_secrets", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync(
                "UPDATE campaign_secrets SET content=@Content WHERE id=@Id", @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_secrets", @params, rows);
            return secret;
        }

        public async Task RevealAsync(Guid secretId, DateTime revealedAt)
        {
            var spanId = correlation.NewSpan();
            var @params = new { SecretId = secretId, RevealedAt = revealedAt };

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_secrets", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync(
                "UPDATE campaign_secrets SET is_revealed=TRUE, revealed_at=@RevealedAt WHERE id=@SecretId",
                @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_secrets", @params, rows);
        }

        public async Task ResealAsync(Guid secretId)
        {
            var spanId = correlation.NewSpan();
            var @params = new { SecretId = secretId };

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_secrets", @params);

            using var conn = sqlConnectionFactory.GetConnection();
            var rows = await conn.ExecuteAsync(
                "UPDATE campaign_secrets SET is_revealed=FALSE, revealed_at=NULL WHERE id=@SecretId",
                @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "campaign_secrets", @params, rows);
        }
    }
}
