using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Configuration;
using CastLibrary.Shared.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Newtonsoft.Json;
using Stripe;

namespace CastLibrary.WebHost.Filters;

public class StripeWebhookSecurityFilter : ActionFilterAttribute
{
    public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var stripeConfiguration = context.HttpContext.RequestServices.GetRequiredService<IStripeConfiguration>();
        var loggingService = context.HttpContext.RequestServices.GetRequiredService<ILoggingService>();
        
        loggingService.LogInformation("StripeWebhookSecurityFilter: Entry - Processing webhook request");
        
        try
        {
            var stripeSignature = context.HttpContext.Request.Headers["Stripe-Signature"].ToString();
            var webhookSecret = stripeConfiguration.WebhookSecret;

            if (string.IsNullOrWhiteSpace(stripeSignature))
            {
                loggingService.LogWarning("StripeWebhookSecurityFilter: Exit - Stripe-Signature header is missing");
                context.Result = new BadRequestObjectResult(new { error = "Stripe-Signature header is missing" });
                return;
            }

            if (string.IsNullOrWhiteSpace(webhookSecret))
            {
                loggingService.LogWarning("StripeWebhookSecurityFilter: Exit - Webhook secret is not configured");
                context.Result = new BadRequestObjectResult(new { error = "Webhook secret is not configured" });
                return;
            }

            context.HttpContext.Request.EnableBuffering();
            context.HttpContext.Request.Body.Position = 0;

            using var reader = new StreamReader(context.HttpContext.Request.Body, leaveOpen: true);
            var jsonPayload = await reader.ReadToEndAsync();

            if (string.IsNullOrWhiteSpace(jsonPayload))
            {
                loggingService.LogWarning("StripeWebhookSecurityFilter: Exit - Request body is empty");
                context.Result = new BadRequestObjectResult(new { error = "Request body is empty" });
                return;
            }

            EventUtility.ConstructEvent(jsonPayload, stripeSignature, webhookSecret, throwOnApiVersionMismatch: false);

            var payload = JsonConvert.DeserializeObject<StripeEventPayload>(jsonPayload);
            loggingService.LogInformation($"StripeWebhookSecurityFilter: Signature validated successfully for event type {payload?.Type}");

            // Extract userId from metadata for all events
            if (payload.Data != null && payload.Data["object"] != null)
            {
                var obj = payload.Data["object"];
                var metadata = obj["metadata"]?.ToObject<Dictionary<string, string>>();

                if (metadata != null && metadata.TryGetValue("userId", out var userIdStr) && Guid.TryParse(userIdStr, out var parsedUserId))
                {
                    payload.UserId = parsedUserId;
                }
            }

            // Store payload in HttpContext.Items for controller to access
            context.HttpContext.Items["StripePayload"] = payload;

            context.HttpContext.Request.Body.Position = 0;
            loggingService.LogInformation("StripeWebhookSecurityFilter: Exit - Passing request to controller");
            await next();
        }
        catch (StripeException ex)
        {
            loggingService.LogError($"StripeWebhookSecurityFilter: Exit - Invalid Stripe signature: {ex.Message}");
            context.Result = new BadRequestObjectResult(new { error = $"Invalid Stripe signature: {ex.Message}" });
            return;
        }
        catch(Exception e)
        {
            loggingService.LogError($"StripeWebhookSecurityFilter: Exit - Unexpected error: {e.Message}");
            var a = 32;
        }
    }
}
