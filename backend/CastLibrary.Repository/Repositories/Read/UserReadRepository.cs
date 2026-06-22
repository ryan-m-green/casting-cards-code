using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;

namespace CastLibrary.Repository.Repositories.Read;

public interface IUserReadRepository
{
    Task<bool> ExistsByEmailAsync(string email);
    Task<UserDomain> GetByEmailAsync(string email);
    Task<UserDomain> GetByIdAsync(Guid id);
    Task<string[]> GetKeywordsAsync(Guid userId);
    Task<List<UserDomain>> GetAllUsersAsync();
    Task<List<CastLibrary.Shared.Responses.UserManagementResponse>> GetAllUsersWithSubscriptionAsync();
    Task<UserDomain> GetByEmailVerificationTokenAsync(string token);
    Task<List<InactiveFreeTrialUserDomain>> GetInactiveFreeTrialUsersAsync();
}

public class UserReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    IUserEntityMapper mapper) : IUserReadRepository
{
    private class UserSubscriptionEntity
    {
        public Guid id { get; set; }
        public string email { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string role { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoggedInOn { get; set; }
        public Guid? SubscriptionId { get; set; }
        public string StripeCustomerId { get; set; }
        public string StripeSubscriptionId { get; set; }
        public string Status { get; set; }
        public bool? BypassPayment { get; set; }
        public DateTime? CurrentPeriodEnd { get; set; }
        public string LockLevel { get; set; }
    }
    public async Task<bool> ExistsByEmailAsync(string email)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        return await conn.ExecuteScalarAsync<bool>(
            "SELECT EXISTS(SELECT 1 FROM users WHERE email = @Email)", new { Email = email });
    }

    public async Task<UserDomain> GetByEmailAsync(string email)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<UserEntity>(
            @"SELECT id, email, password_hash AS PasswordHash, display_name AS DisplayName, role, keywords, created_at AS CreatedAt, token_version AS TokenVersion, email_verified AS EmailVerified, email_verification_token AS EmailVerificationToken, last_logged_in_on AS LastLoggedInOn
              FROM users WHERE email = @Email", new { Email = email });
        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<UserDomain> GetByIdAsync(Guid id)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<UserEntity>(
            @"SELECT id, email, password_hash AS PasswordHash, display_name AS DisplayName, role, keywords, created_at AS CreatedAt, token_version AS TokenVersion, email_verified AS EmailVerified, email_verification_token AS EmailVerificationToken, last_logged_in_on AS LastLoggedInOn
              FROM users WHERE id = @Id", new { Id = id });
        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<string[]> GetKeywordsAsync(Guid userId)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var result = await conn.QueryFirstOrDefaultAsync<string[]>(
            "SELECT keywords FROM users WHERE id = @Id", new { Id = userId });
        return result ?? [];
    }

    public async Task<List<UserDomain>> GetAllUsersAsync()
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entities = await conn.QueryAsync<UserEntity>(
            @"SELECT id, email, password_hash AS PasswordHash, display_name AS DisplayName, role, keywords, created_at AS CreatedAt, token_version AS TokenVersion, email_verified AS EmailVerified, email_verification_token AS EmailVerificationToken, last_logged_in_on AS LastLoggedInOn
              FROM users
              ORDER BY created_at DESC");
        return entities.Select(e => mapper.ToDomain(e)).ToList();
    }

    public async Task<List<CastLibrary.Shared.Responses.UserManagementResponse>> GetAllUsersWithSubscriptionAsync()
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var results = await conn.QueryAsync<UserSubscriptionEntity>(
            @"SELECT u.id, u.email, u.display_name AS DisplayName, u.role, u.created_at AS CreatedAt, u.last_logged_in_on AS LastLoggedInOn,
                     s.id AS SubscriptionId, s.stripe_customer_id AS StripeCustomerId, 
                     s.stripe_subscription_id AS StripeSubscriptionId, s.status AS Status, 
                     s.bypass_payment AS BypassPayment, s.current_period_end AS CurrentPeriodEnd, 
                     s.lock_level AS LockLevel
              FROM users u
              LEFT JOIN subscriptions s ON u.id = s.user_id
              ORDER BY u.created_at DESC");
        
        var users = results.Select(r => new CastLibrary.Shared.Responses.UserManagementResponse
        {
            Id = r.id,
            Email = r.email,
            DisplayName = r.DisplayName,
            Role = r.role,
            CreatedAt = r.CreatedAt,
            LastLoggedInOn = r.LastLoggedInOn,
            SubscriptionId = r.SubscriptionId,
            StripeCustomerId = r.StripeCustomerId ?? string.Empty,
            StripeSubscriptionId = r.StripeSubscriptionId ?? string.Empty,
            Status = r.Status ?? string.Empty,
            BypassPayment = r.BypassPayment ?? false,
            CurrentPeriodEnd = r.CurrentPeriodEnd,
            LockLevel = r.LockLevel ?? string.Empty
        }).ToList();

        return users;
    }

    public async Task<UserDomain> GetByEmailVerificationTokenAsync(string token)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<UserEntity>(
            @"SELECT id, email, password_hash AS PasswordHash, display_name AS DisplayName, role, keywords, created_at AS CreatedAt, token_version AS TokenVersion, email_verified AS EmailVerified, email_verification_token AS EmailVerificationToken, last_logged_in_on AS LastLoggedInOn
              FROM users WHERE email_verification_token = @Token", new { Token = token });
        return entity is null ? null : mapper.ToDomain(entity);
    }

    public async Task<List<InactiveFreeTrialUserDomain>> GetInactiveFreeTrialUsersAsync()
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var users = await conn.QueryAsync<InactiveFreeTrialUserDomain>(
            @"SELECT u.id AS UserId, u.email AS Email, u.display_name AS DisplayName, u.email_verified AS EmailVerified, u.last_logged_in_on AS LastLoggedInOn,
                     s.id AS SubscriptionId, s.status AS Status, s.lock_level AS LockLevel, s.past_due_since AS PastDueSince
              FROM users u
              JOIN subscriptions s ON u.id = s.user_id
              WHERE u.last_logged_in_on IS NOT NULL
                AND u.last_logged_in_on < NOW() - INTERVAL '30 days'
                AND s.status = 'FreeTrial'
                AND s.bypass_payment = false
              ORDER BY u.last_logged_in_on ASC");
        return users.ToList();
    }
}