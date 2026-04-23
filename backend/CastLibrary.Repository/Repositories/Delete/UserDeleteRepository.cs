using CastLibrary.Logic.Interfaces;
using Dapper;

namespace CastLibrary.Repository.Repositories.Delete
{
    public interface IUserDeleteRepository
    {
        Task DeleteUserAndAllDataAsync(Guid userId);
    }

    public class UserDeleteRepository(
        ISqlConnectionFactory sqlConnectionFactory,
        ILoggingService logging,
        ICorrelationContext correlation) : IUserDeleteRepository
    {
        public async Task DeleteUserAndAllDataAsync(Guid userId)
        {
            var spanId = correlation.NewSpan();
            var @params = new { UserId = userId };

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "users_and_all_data", @params);

            using var conn = sqlConnectionFactory.GetConnection();

            // Delete user - cascade will handle most related data
            // Due to ON DELETE CASCADE constraints in the schema, this will automatically delete:
            // - campaigns (where dm_user_id = userId)
            //   - campaign_players
            //   - campaign_invite_codes
            //   - campaign_location_instances
            //   - campaign_sublocation_instances
            //   - campaign_cast_instances
            //   - campaign_secrets
            //   - campaign_notes
            //   - campaign_cast_relationships
            //   - campaign_cast_player_notes
            //   - location_political_notes
            //   - campaign_sublocation_shop_items
            // - locations (where dm_user_id = userId)
            //   - sublocations (ON DELETE SET NULL)
            // - casts (where dm_user_id = userId)
            // - password_reset_tokens
            // - campaign_players (as player)
            // - currency_transactions (ON DELETE SET NULL for player_user_id and created_by)
            // - campaign_notes (created_by_user_id references users but doesn't cascade - needs manual cleanup)

            // First, remove user from campaign_players where they are a player
            await conn.ExecuteAsync(
                "DELETE FROM campaign_players WHERE player_user_id = @UserId",
                @params);

            // Clean up notes created by this user (set created_by_user_id to null or delete)
            await conn.ExecuteAsync(
                "DELETE FROM campaign_notes WHERE created_by_user_id = @UserId",
                @params);

            // Clean up currency transactions where user is creator
            await conn.ExecuteAsync(
                "UPDATE currency_transactions SET created_by = NULL WHERE created_by = @UserId",
                @params);

            // Now delete the user - cascades will handle campaigns they own and all related data
            var rows = await conn.ExecuteAsync(
                "DELETE FROM users WHERE id = @UserId",
                @params);

            logging.LogDbOperation(correlation.TraceId, spanId, "DELETE", "users_and_all_data", @params, rows);
        }
    }
}
