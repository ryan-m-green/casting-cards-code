using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IPlayerCardTraitInsertRepository
{
    Task<PlayerCardTraitDomain> InsertAsync(PlayerCardTraitDomain trait);
}

public class PlayerCardTraitInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IPlayerCardTraitInsertRepository
{
    public async Task<PlayerCardTraitDomain> InsertAsync(PlayerCardTraitDomain trait)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            trait.Id,
            trait.PlayerCardId,
            TraitType = trait.TraitType.ToString(),
            trait.Content,
            trait.IsCompleted,
            trait.CreatedAt,
        };
        const string sql =
            @"INSERT INTO player_card_traits (id, player_card_id, trait_type, content, is_completed, created_at)
              VALUES (@Id, @PlayerCardId, @TraitType, @Content, @IsCompleted, @CreatedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_card_traits", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "player_card_traits", @params, rows);
        return trait;
    }
}
