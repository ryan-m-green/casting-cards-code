using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Factories
{
    public interface ISublocationCardFactory
    {
        SublocationCard Create(SublocationDomain sublocation, string imageFileName);
    }
    public class SublocationCardFactory : ISublocationCardFactory
    {
        public SublocationCard Create(SublocationDomain sublocation, string imageFileName)
        {
            return new SublocationCard
            {
                Name = sublocation.Name,
                Description = sublocation.Description,
                ImageFileName = imageFileName,
                ShopItems = sublocation.ShopItems.Select(s => new ShopItemCard
                {
                    Name = s.Name,
                    Price = s.Price,
                    Description = s.Description
                }).ToList()
            };
        }
    }
}
