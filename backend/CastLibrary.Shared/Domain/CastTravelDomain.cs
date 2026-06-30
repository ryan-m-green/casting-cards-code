namespace CastLibrary.Shared.Domain
{
    public class CastTravelDomain
    {
        public CastTravelDomain(bool traveledToTheParty)
        {
            TraveledToTheParty = traveledToTheParty;
        }

        public bool TraveledToTheParty { get; }
    }
}
