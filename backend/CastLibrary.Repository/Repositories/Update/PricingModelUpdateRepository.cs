using Dapper;

namespace CastLibrary.Repository.Repositories.Update;

public interface IPricingModelUpdateRepository
{
    Task<bool> UpdatePricingModelActiveStatusAsync(string modelName, bool isActive);
    Task<bool> UpdatePricingModelPriceAsync(string modelName, int priceInCents);
}

public class PricingModelUpdateRepository(ISqlConnectionFactory sqlConnectionFactory) : IPricingModelUpdateRepository
{
    public async Task<bool> UpdatePricingModelActiveStatusAsync(string modelName, bool isActive)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        
        if (isActive)
        {
            // First, set all models to inactive
            await conn.ExecuteAsync(
                @"UPDATE pricing_model SET is_active = false");
            
            // Then set the specified model to active
            var rows = await conn.ExecuteAsync(
                @"UPDATE pricing_model 
                  SET is_active = true 
                  WHERE model_name = @ModelName",
                new { ModelName = modelName });
            
            return rows > 0;
        }
        else
        {
            var rows = await conn.ExecuteAsync(
                @"UPDATE pricing_model 
                  SET is_active = false 
                  WHERE model_name = @ModelName",
                new { ModelName = modelName });
            
            return rows > 0;
        }
    }

    public async Task<bool> UpdatePricingModelPriceAsync(string modelName, int priceInCents)
    {
        using var conn = sqlConnectionFactory.GetConnection();
        var rows = await conn.ExecuteAsync(
            @"UPDATE pricing_model 
              SET price_in_cents = @PriceInCents 
              WHERE model_name = @ModelName",
            new { ModelName = modelName, PriceInCents = priceInCents });
        
        return rows > 0;
    }
}
