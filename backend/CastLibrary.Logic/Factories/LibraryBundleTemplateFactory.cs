using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Factories
{
    public interface ILibraryBundleTemplateFactory
    {
        LibraryBundle Create();
    }
    public class LibraryBundleTemplateFactory : ILibraryBundleTemplateFactory
    {
        public LibraryBundle Create()
        {
            return new LibraryBundle
            {
                Casts =
                [
                    new CastCard
                    {
                        Name = "Aldric Vane",
                        Pronouns = "he/him",
                        Race = "Human",
                        Role = "Merchant",
                        Age = "45",
                        Alignment = "Neutral Good",
                        Posture = "Slouched",
                        Speed = "Slow",
                        VoicePlacement = ["Low", "Raspy"],
                        Description = "Private DM notes about this Cast.",
                        PublicDescription = "What the players see and know.",
                        ImageFileName = "cast_aldric_vane.png",
                    },
                ],
                Locations =
                 [
                     new LocationCard
                     {
                         Name = "Ironhaven",
                         Classification = "Location",
                         Size = "Large",
                         Condition = "Weathered",
                         Geography = "Coastal",
                         Architecture = "Gothic",
                         Climate = "Temperate",
                         Religion = "The Old Gods",
                         Vibe = "Gritty",
                         Languages = "Common, Dwarvish",
                         Description = "A port Location known for its iron trade.",
                         ImageFileName = "location_ironhaven.png",
                     },
                 ],
                Sublocations =
                [
                    new SublocationCard
                    {
                        Name = "The Rusty Flagon",
                        Description = "A dimly lit tavern on the docks.",
                        ImageFileName = "loc_rusty_flagon.png",
                        ShopItems =
                        [
                            new ShopItemCard { Name = "Ale", Price = "2cp", Description = "Warm and flat." },
                            new ShopItemCard { Name = "Stew", Price = "4cp", Description = "Mystery meat." },
                        ],
                    },
                ],
            };
        }
    }
}
