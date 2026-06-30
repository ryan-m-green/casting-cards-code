using System.ComponentModel;
using System.Reflection;

namespace CastLibrary.Shared.Enums;

public enum EntityType
{
    [Description("cast")]
    Cast,
    [Description("location")]
    Location,
    [Description("sublocation")]
    Sublocation,
    [Description("player")]
    PlayerCard,
    [Description("faction")]
    Faction,
    [Description("campaign-handout")]
    CampaignHandout,
    [Description("time-of-day")]
    TimeOfDay,
    [Description("campaign-event")]
    CampaignEvent
}

public static class EntityTypeExtensions
{
    public static string GetDescription(this EntityType entityType)
    {
        var fieldInfo = entityType.GetType().GetField(entityType.ToString());
        var attribute = fieldInfo?.GetCustomAttribute<DescriptionAttribute>();
        return attribute?.Description ?? entityType.ToString();
    }
}
