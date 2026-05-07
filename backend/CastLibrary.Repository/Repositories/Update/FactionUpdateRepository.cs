using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Domain;
using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IFactionUpdateRepository
{
    Task<FactionDomain?> UpdateAsync(FactionDomain faction);
}

public class FactionUpdateRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    ILoggingService logging,
    ICorrelationContext correlation) : IFactionUpdateRepository
{
    public async Task<FactionDomain?> UpdateAsync(FactionDomain faction)
    {
        var spanId = correlation.NewSpan();
        var @params = new
        {
            FactionId  = faction.FactionId,
            faction.Name,
            faction.Type,
            faction.Influence,
            faction.Hidden,
            faction.Description,
            faction.DmNotes,
            faction.SymbolPath,
        };
        const string sql =
            @"UPDATE factions
                 SET name = @Name, type = @Type, influence = @Influence,
                     hidden = @Hidden,
                     description = @Description, dm_notes = @DmNotes, symbol_path = @SymbolPath
               WHERE faction_id = @FactionId";

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "factions", @params);

        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(sql, @params);

        logging.LogDbOperation(correlation.TraceId, spanId, "UPDATE", "factions", @params, rows);
        return rows == 0 ? null : faction;
    }
}
