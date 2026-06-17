using System.Text.Json;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Shared.Responses;

namespace CastLibrary.Logic.Queries.Admin;

public interface IGetConfigurationQueryHandler
{
    Task<List<ConfigurationDto>> HandleAsync();
}

public class GetConfigurationQueryHandler(
    ICastcardsConfigurationReadRepository configurationReadRepository,
    IPricingModelReadRepository pricingModelReadRepository) : IGetConfigurationQueryHandler
{
    public async Task<List<ConfigurationDto>> HandleAsync()
    {
        var entities = await configurationReadRepository.GetAllConfigurationsAsync();
        var configurations = entities.Select(e => new ConfigurationDto
        {
            Id = e.Id,
            Key = e.Key,
            Value = e.Value
        }).ToList();

        var pricingModels = await pricingModelReadRepository.GetAllPricingModelsAsync();
        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        var pricingModelsJson = JsonSerializer.Serialize(pricingModels, options);

        configurations.Add(new ConfigurationDto
        {
            Id = Guid.Empty,
            Key = "pricing_model",
            Value = pricingModelsJson
        });

        return configurations;
    }
}
