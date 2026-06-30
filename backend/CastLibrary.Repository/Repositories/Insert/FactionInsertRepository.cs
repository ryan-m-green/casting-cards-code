using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Insert;

public interface IFactionInsertRepository
{
    Task<FactionDomain> InsertAsync(FactionDomain faction);
}

public class FactionInsertRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IFactionInsertRepository
{
    public async Task<FactionDomain> InsertAsync(FactionDomain faction)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            FactionId  = faction.FactionId,
            DmUserId   = faction.DmUserId,
            faction.Name,
            faction.Type,
            faction.Influence,
            faction.Perception,
            faction.Hidden,
            faction.Description,
            faction.DmNotes,
            faction.SymbolPath,
            faction.CreatedAt,
        };
        const string sql =
            @"INSERT INTO factions
                (faction_id, dm_user_id, name, type, influence, perception, hidden, description, dm_notes, symbol_path, created_at)
              VALUES
                (@FactionId, @DmUserId, @Name, @Type, @Influence, @Perception, @Hidden, @Description, @DmNotes, @SymbolPath, @CreatedAt)";

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "factions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "INSERT", "factions", @params, rows);
        return faction;
    }
}
