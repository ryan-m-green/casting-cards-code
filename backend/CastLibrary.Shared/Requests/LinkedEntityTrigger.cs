using CastLibrary.Shared.Domain;

namespace CastLibrary.Shared.Requests;

public class LinkedEntityTrigger
{
    public List<Domain.LinkedEntityTrigger> LinkedEntities { get; set; } = [];
}
