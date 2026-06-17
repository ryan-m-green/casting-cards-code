using CastLibrary.Repository.Mappers;
using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using Dapper;
namespace CastLibrary.Repository.Repositories.Read;
public interface IPricingModelReadRepository
{
    Task<PricingModelDomain> GetActiveAsync();
    Task<PricingModelDomain> GetByNameAsync(string modelName);
    Task<List<PricingModelEntity>> GetAllPricingModelsAsync();
}
public class PricingModelReadRepository(
    ISqlConnectionFactory sqlConnectionFactory,
    IPricingModelEntityMapper mapper) : IPricingModelReadRepository
{
    public async Task<PricingModelDomain> GetActiveAsync()
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<PricingModelEntity>(
            @"SELECT id, model_name AS ModelName, price_in_cents AS PriceInCents,
                     stripe_price_id AS StripePriceId, is_active AS IsActive, account_type AS AccountType
              FROM pricing_model WHERE is_active = true LIMIT 1");
        if (entity is null)
            throw new InvalidOperationException("No active pricing model found");
        return mapper.ToDomain(entity);
    }
    public async Task<PricingModelDomain> GetByNameAsync(string modelName)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entity = await conn.QueryFirstOrDefaultAsync<PricingModelEntity>(
            @"SELECT id, model_name AS ModelName, price_in_cents AS PriceInCents,
                     stripe_price_id AS StripePriceId, is_active AS IsActive, account_type AS AccountType
              FROM pricing_model WHERE model_name = @ModelName", new { ModelName = modelName });
        if (entity is null)
            throw new InvalidOperationException($"Pricing model '{modelName}' not found");
        return mapper.ToDomain(entity);
    }

    public async Task<List<PricingModelEntity>> GetAllPricingModelsAsync()
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var entities = await conn.QueryAsync<PricingModelEntity>(
            @"SELECT id, model_name AS ModelName, price_in_cents AS PriceInCents,
                     stripe_price_id AS StripePriceId, is_active AS IsActive, account_type AS AccountType
              FROM pricing_model
              ORDER BY account_type, model_name");
        return entities.ToList();
    }
}
