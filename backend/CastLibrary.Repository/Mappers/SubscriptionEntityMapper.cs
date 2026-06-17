using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Entities;
using CastLibrary.Shared.Enums;
using System.Text;

namespace CastLibrary.Repository.Mappers;
public interface ISubscriptionEntityMapper
{
    SubscriptionDomain ToDomain(SubscriptionEntity entity);
    SubscriptionEntity ToEntity(SubscriptionDomain domain);
}
public class SubscriptionEntityMapper : ISubscriptionEntityMapper
{
    public SubscriptionDomain ToDomain(SubscriptionEntity entity) => new()
    {
        Id = entity.Id,
        UserId = entity.UserId,
        StripeCustomerId = entity.StripeCustomerId,
        StripeSubscriptionId = entity.StripeSubscriptionId,
        Status = ParseEnum<SubscriptionStatus>(entity.Status),
        PricingModelId = entity.PricingModelId,
        BypassPayment = entity.BypassPayment,
        CurrentPeriodEnd = entity.CurrentPeriodEnd,
        CreatedAt = entity.CreatedAt,
        PastDueSince = entity.PastDueSince,
        LockLevel = ParseEnum<LockLevel>(entity.LockLevel)
    };

    public SubscriptionEntity ToEntity(SubscriptionDomain domain) => new()
    {
        Id = domain.Id,
        UserId = domain.UserId,
        StripeCustomerId = domain.StripeCustomerId,
        StripeSubscriptionId = domain.StripeSubscriptionId,
        Status = domain.Status.ToString(),
        PricingModelId = domain.PricingModelId,
        BypassPayment = domain.BypassPayment,
        CurrentPeriodEnd = domain.CurrentPeriodEnd,
        CreatedAt = domain.CreatedAt,
        PastDueSince = domain.PastDueSince,
        LockLevel = domain.LockLevel.ToString()
    };

    private static T ParseEnum<T>(string value) where T : struct, Enum
    {
        if (string.IsNullOrEmpty(value))
        {
            return default;
        }

        // Try direct parse first (for PascalCase)
        if (Enum.TryParse<T>(value, true, out var result))
        {
            return result;
        }

        // Convert snake_case to PascalCase and try again
        var pascalCase = ToPascalCase(value);
        if (Enum.TryParse<T>(pascalCase, false, out result))
        {
            return result;
        }

        throw new ArgumentException($"'{value}' is not a valid value for enum {typeof(T).Name}");
    }

    private static string ToPascalCase(string snakeCase)
    {
        if (string.IsNullOrEmpty(snakeCase))
        {
            return snakeCase;
        }

        var words = snakeCase.Split('_');
        var sb = new StringBuilder();
        foreach (var word in words)
        {
            if (word.Length > 0)
            {
                sb.Append(char.ToUpper(word[0]));
                if (word.Length > 1)
                {
                    sb.Append(word.Substring(1).ToLower());
                }
            }
        }
        return sb.ToString();
    }
}
