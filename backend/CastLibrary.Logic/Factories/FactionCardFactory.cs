using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Factories
{
    public interface IFactionCardFactory
    {
        FactionCard Create(FactionDomain faction);
    }
    public class FactionCardFactory : IFactionCardFactory   
    {
        public FactionCard Create(FactionDomain faction)
        {
            return new FactionCard
            {
                Name = faction.Name,
                FactionType = faction.Type,
                Influence = faction.Influence,
                Perception = faction.Perception,
                Description = faction.Description,
                Hidden = faction.Hidden,
                SymbolPath = faction.SymbolPath
            };
        }
    }
}
