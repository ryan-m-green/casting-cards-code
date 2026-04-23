using CastLibrary.Logic.Commands.BugReport;
using CastLibrary.Logic.Queries.BugReport;
using CastLibrary.Shared.Requests;
using CastLibrary.Shared.Responses;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/bug-reports")]
[Authorize]
public class BugReportsController(
    ISubmitBugReportCommandHandler submitBugReport,
    IGetBugReportsQueryHandler getBugReports,
    IMarkBugFixedCommandHandler markBugFixed,
    ICleanupBugReportsCommandHandler cleanupBugReports,
    IDeleteBugReportCommandHandler deleteBugReport,
    IUpdateBugSeverityCommandHandler updateBugSeverity,
    IUserRetriever userRetriever) : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "DM,Player")]
    public async Task<IActionResult> Submit([FromBody] SubmitBugReportRequest request)
    {
        var userId = userRetriever.GetUserId(User);
        var command = new SubmitBugReportCommand(userId, request);
        var result = await submitBugReport.HandleAsync(command);

        return Ok(MapToResponse(result));
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll()
    {
        var bugs = await getBugReports.HandleAsync();
        return Ok(bugs.Select(MapToResponse).ToList());
    }

    [HttpPatch("{id:guid}/mark-fixed")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> MarkFixed(Guid id)
    {
        await markBugFixed.HandleAsync(id);
        return NoContent();
    }

    [HttpPatch("{id:guid}/severity")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateSeverity(Guid id, [FromBody] UpdateBugSeverityRequest request)
    {
        await updateBugSeverity.HandleAsync(id, request.Severity);
        return NoContent();
    }

    [HttpDelete("cleanup")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Cleanup()
    {
        await cleanupBugReports.HandleAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await deleteBugReport.HandleAsync(id);
        return NoContent();
    }

    private static BugReportResponse MapToResponse(Shared.Domain.BugReportDomain domain) => new()
    {
        Id = domain.Id,
        UserId = domain.UserId,
        Title = domain.Title,
        Description = domain.Description,
        StepsToReproduce = domain.StepsToReproduce,
        Severity = domain.Severity,
        PageUrl = domain.PageUrl,
        Device = domain.Device,
        Browser = domain.Browser,
        Os = domain.Os,
        ScreenResolution = domain.ScreenResolution,
        IsFixed = domain.IsFixed,
        FixedAt = domain.FixedAt,
        ReportedAt = domain.ReportedAt,
        ReporterDisplayName = domain.ReporterDisplayName,
    };
}
