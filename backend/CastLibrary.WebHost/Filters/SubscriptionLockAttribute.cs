using Microsoft.AspNetCore.Authorization;

namespace CastLibrary.WebHost.Filters;

/// <summary>
/// Attribute that marks endpoints as accessible in locked subscription states.
/// When applied to a controller or action, the endpoint will remain accessible
/// even when the user's account is in SoftLock, HardLock, or Suspended state.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class AllowInLockedStateAttribute : Attribute
{
}
