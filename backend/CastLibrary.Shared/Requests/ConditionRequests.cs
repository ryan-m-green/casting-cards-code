namespace CastLibrary.Shared.Requests;

public class CreateConditionRequest
{
    public string Name { get; set; } = string.Empty;
    public string Consequence { get; set; } = string.Empty;
    public List<string> Keywords { get; set; } = [];
    public string Color { get; set; } = string.Empty;
}

public class UpdateConditionRequest : CreateConditionRequest
{
}

public class LinkConditionsRequest
{
    public List<Guid> ConditionIds { get; set; } = [];
}
