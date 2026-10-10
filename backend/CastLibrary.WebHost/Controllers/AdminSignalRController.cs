#nullable enable

using CastLibrary.WebHost.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

/// <summary>
/// The admin's window on the campaign hub: who is connected, what was broadcast, and what the
/// receiving clients said came back (see SignalRInspector for what is held and how acks are
/// paired with their sends).
///
/// Admin-only, deliberately: it is a debugging view of live traffic, and it shows payloads as
/// they went out to players. A GM's own campaign is not enough to open it — the role is.
/// </summary>
[ApiController]
[Route("api/admin/signalr")]
[Authorize(Roles = "Admin")]
public class AdminSignalRController(SignalRInspector inspector) : ControllerBase
{
    /// <summary>
    /// The window's whole state: the open connections, the last broadcasts (newest first) with the
    /// acks that belong to each, and any acks that matched no send. Pass a campaignId to narrow it
    /// to that campaign's broadcasts — sends aimed at one user, or at everyone, still show, since
    /// they are not a campaign's own business.
    /// </summary>
    [HttpGet("state")]
    public IActionResult GetState([FromQuery] string? campaignId, [FromQuery] int take = 200)
        => Ok(inspector.Report(campaignId, Math.Clamp(take, 1, SignalRInspector.Capacity)));

    /// <summary>Empties the window's history — it is a window, not a record.</summary>
    [HttpPost("clear")]
    public IActionResult Clear()
    {
        inspector.Clear();
        return Ok(new { cleared = true });
    }
}
