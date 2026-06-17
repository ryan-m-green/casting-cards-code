using System.Text.Json;
using CastLibrary.Repository.Repositories.Insert;
using CastLibrary.Repository.Repositories.Read;
using CastLibrary.Repository.Repositories.Update;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Commands.Admin;

public interface IUpdateConfigurationCommandHandler
{
    Task<(bool Success, string Error)> HandleAsync(UpdateConfigurationCommand command);
}

public class UpdateConfigurationCommandHandler(
    ICastcardsConfigurationReadRepository configurationReadRepository,
    ICastcardsConfigurationUpdateRepository configurationUpdateRepository,
    ICastcardsConfigurationInsertRepository configurationInsertRepository,
    IPricingModelUpdateRepository pricingModelUpdateRepository) : IUpdateConfigurationCommandHandler
{
    public async Task<(bool Success, string Error)> HandleAsync(UpdateConfigurationCommand command)
    {
        var entities = await configurationReadRepository.GetAllConfigurationsAsync();

        foreach (var request in command.Requests)
        {
            if (request.Key == "pricing_model")
            {
                var success = await UpdatePricingModelsAsync(request.Value);
                if (!success)
                    return (false, "Failed to update pricing model active status.");
                continue;
            }

            // Skip entries with empty ids (pricing_model)
            if (request.Id == Guid.Empty)
            {
                continue;
            }

            var existingEntity = entities.FirstOrDefault(e => e.Id == request.Id);

            if (existingEntity != null)
            {
                var success = await configurationUpdateRepository.UpdateConfigurationByIdAsync(
                    request.Id,
                    request.Key,
                    request.Value);
                
                if (!success)
                    return (false, $"Failed to update configuration with key '{request.Key}'.");
            }
            else
            {
                await configurationInsertRepository.CreateConfigurationAsync(
                    request.Id == Guid.Empty ? Guid.NewGuid() : request.Id,
                    request.Key,
                    request.Value);
            }
        }

        return (true, null);
    }

    private async Task<bool> UpdatePricingModelsAsync(string pricingModelsJson)
    {
        var pricingModels = JsonSerializer.Deserialize<List<JsonElement>>(pricingModelsJson);
        if (pricingModels == null)
            return false;

        var activeModelName = pricingModels
            .Where(p => p.GetProperty("isActive").GetBoolean())
            .Select(p => p.GetProperty("modelName").GetString())
            .FirstOrDefault();

        if (activeModelName != null)
        {
            var success = await pricingModelUpdateRepository.UpdatePricingModelActiveStatusAsync(activeModelName, true);
            if (!success)
                return false;
        }

        foreach (var model in pricingModels)
        {
            var modelName = model.GetProperty("modelName").GetString();
            var priceInCents = model.GetProperty("priceInCents").GetInt32();

            if (modelName != null)
            {
                var success = await pricingModelUpdateRepository.UpdatePricingModelPriceAsync(modelName, priceInCents);
                if (!success)
                    return false;
            }
        }

        return true;
    }
}

public class UpdateConfigurationCommand
{
    public UpdateConfigurationCommand(List<UpdateConfigurationRequest> requests)
    {
        Requests = requests;
    }

    public List<UpdateConfigurationRequest> Requests { get; }
}
