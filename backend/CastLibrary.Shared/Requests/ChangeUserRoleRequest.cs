namespace CastLibrary.Shared.Requests;

public class ChangeUserRoleRequest
{
    public string NewRole { get; set; } = string.Empty;
    public string AdminPassword { get; set; } = string.Empty;
}
