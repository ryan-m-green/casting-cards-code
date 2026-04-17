using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Factories
{
    public interface ICastCardFactory
    {
        CastCard Create(CastDomain cast, string imageFileName);
    }
    public class CastCardFactory : ICastCardFactory
    {
        public CastCard Create(CastDomain cast, string imageFileName)
        {
            return new CastCard()
            {
                Name = cast.Name,
                Pronouns = cast.Pronouns,
                Race = cast.Race,
                Role = cast.Role,
                Age = cast.Age,
                Alignment = cast.Alignment,
                Posture = cast.Posture,
                Speed = cast.Speed,
                VoicePlacement = cast.VoicePlacement,
                Description = cast.Description,
                PublicDescription = cast.PublicDescription,
                ImageFileName = imageFileName,
            };
        }
    }
}
