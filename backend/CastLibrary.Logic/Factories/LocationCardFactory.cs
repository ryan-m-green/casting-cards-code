using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Factories
{
    public interface ILocationCardFactory
    {
        LocationCard Create(LocationDomain location, string imageFileName);
    }
    public class LocationCardFactory : ILocationCardFactory
    {
        public LocationCard Create(LocationDomain location, string imageFileName)
        {
            return new LocationCard
            {
                Name = location.Name,
                Classification = location.Classification,
                Size = location.Size,
                Condition = location.Condition,
                Geography = location.Geography,
                Architecture = location.Architecture,
                Climate = location.Climate,
                Religion = location.Religion,
                Vibe = location.Vibe,
                Languages = location.Languages,
                Description = location.Description,
                ImageFileName = imageFileName
            };
        }
    }
}
