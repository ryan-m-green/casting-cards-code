using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;
namespace CastLibrary.Logic.Factories;

public interface ICastFactory
{
    CastDomain Create(CreateCastRequest request, Guid dmUserId);
}
public class CastFactory : ICastFactory
{
    public CastDomain Create(CreateCastRequest request, Guid dmUserId) => new()
    {
        Id = Guid.NewGuid(),
        DmUserId = dmUserId,
        Name = request.Name,
        Pronouns = request.Pronouns,
        Race = request.Race,
        Role = request.Role,
        Age = request.Age,
        Alignment = request.Alignment,
        Posture = request.Posture,
        Speed = request.Speed,
        VoicePlacement = request.VoicePlacement,
        VoiceNotes = request.VoiceNotes,
        Description = request.Description,
        PublicDescription = request.PublicDescription,
        CreatedAt = DateTime.UtcNow,
    };
}
