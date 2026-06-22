using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;

namespace CastLibrary.WebHost.Filters;

public class ModelStateValidationFilter : IActionFilter
{
    private readonly ILogger<ModelStateValidationFilter> _logger;

    public ModelStateValidationFilter(ILogger<ModelStateValidationFilter> logger)
    {
        _logger = logger;
    }

    public void OnActionExecuting(ActionExecutingContext context)
    {
        // Log model state errors for POST /api/cast
        if (context.HttpContext.Request.Path.StartsWithSegments("/api/cast") && 
            context.HttpContext.Request.Method == "POST" &&
            !context.ModelState.IsValid)
        {
            var errors = context.ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .SelectMany(x => x.Value!.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();

            _logger.LogError("POST /api/cast - Model state validation failed. Errors: {Errors}", string.Join(", ", errors));

            // Log the raw request body if possible
            if (context.HttpContext.Request.ContentLength > 0)
            {
                context.HttpContext.Request.EnableBuffering();
                context.HttpContext.Request.Body.Position = 0;
                using var reader = new StreamReader(context.HttpContext.Request.Body);
                var requestBody = reader.ReadToEndAsync().Result;
                context.HttpContext.Request.Body.Position = 0;
                
                _logger.LogError("POST /api/cast - Request body that failed model state: {RequestBody}", requestBody);
            }

            // Return a detailed error response
            context.Result = new BadRequestObjectResult(new
            {
                Message = "Model validation failed",
                Errors = errors
            });
        }
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        // Log any exceptions that occurred during action execution
        if (context.Exception != null && 
            context.HttpContext.Request.Path.StartsWithSegments("/api/cast") && 
            context.HttpContext.Request.Method == "POST")
        {
            _logger.LogError(context.Exception, "POST /api/cast - Exception during action execution");
            
            // Try to log request body
            if (context.HttpContext.Request.ContentLength > 0)
            {
                context.HttpContext.Request.EnableBuffering();
                context.HttpContext.Request.Body.Position = 0;
                using var reader = new StreamReader(context.HttpContext.Request.Body);
                var requestBody = reader.ReadToEndAsync().Result;
                context.HttpContext.Request.Body.Position = 0;
                
                _logger.LogError("POST /api/cast - Request body that caused exception: {RequestBody}", requestBody);
            }
        }
    }
}
