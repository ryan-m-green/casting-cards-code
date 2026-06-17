using CastLibrary.Shared.Enums;

namespace CastLibrary.Shared.Extensions;

public static class CastCardsConfigurationKeysExtensions
{
    public static string ToDbKey(this CastCardsConfigurationKeys key)
    {
        return key switch
        {
            CastCardsConfigurationKeys.SubscriptionLimits => "subscription_limits",
            CastCardsConfigurationKeys.DoodleArt => "doodle_art",
            CastCardsConfigurationKeys.StopWords => "stop_words",
            _ => key.ToString().ToLower()
        };
    }
    
}
