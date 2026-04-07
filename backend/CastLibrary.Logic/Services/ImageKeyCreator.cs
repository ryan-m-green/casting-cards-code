using CastLibrary.Shared.Enums;

namespace CastLibrary.Logic.Services
{
    public interface IImageKeyCreator
    {
        string Create(Guid dmUserId, Guid playerCardId, EntityType playerCardType);
    }
    public class ImageKeyCreator : IImageKeyCreator
    {
        public string Create(Guid dmUserId, Guid playerCardId, EntityType playerCardType)
        {
            switch (playerCardType)
            {
                case EntityType.Cast:
                    return $"{dmUserId}/casts/{playerCardId}.png";
                case EntityType.Sublocation:
                    return $"{dmUserId}/sublocations/{playerCardId}.png";
                case EntityType.City:
                    return $"{dmUserId}/cities/{playerCardId}.png";
                default: return string.Empty;
            }
        }
    }
}
