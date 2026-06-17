using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CastLibrary.Logic.Commands.ScheduledWorkflows;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/scheduled-workflows")]
[AllowAnonymous]
public class ScheduledWorkflowsController(IProcessInactiveFreeTrialUsersCommandHandler processInactiveUsers) : ControllerBase
{
    private const string ApiKeyHeaderName = "X-Scheduled-Workflow-Key";

    [HttpPost("process-inactive-free-trial-users")]
    public async Task<IActionResult> ProcessInactiveFreeTrialUsers()
    {
        if (!IsValidApiKey())
        {
            return Unauthorized();
        }

        await processInactiveUsers.HandleAsync();
        return StatusCode(201);
    }

    private bool IsValidApiKey()
    {
        var expectedKey = Environment.GetEnvironmentVariable("SCHEDULED_WORKFLOW_API_KEY");
        if (string.IsNullOrEmpty(expectedKey))
        {
            return false;
        }

        var providedKey = Request.Headers[ApiKeyHeaderName].FirstOrDefault();
        return providedKey == expectedKey;
    }
}
