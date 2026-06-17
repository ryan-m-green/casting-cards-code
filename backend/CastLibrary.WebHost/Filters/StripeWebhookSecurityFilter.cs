using CastLibrary.Logic.Interfaces;
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
        try
        {
            var configuration = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
            var loggingService = context.HttpContext.RequestServices.GetRequiredService<ILoggingService>();
            var stripeSignature = context.HttpContext.Request.Headers["Stripe-Signature"].ToString();
            var webhookSecret = configuration["Stripe:WebhookSecret"];

            if (string.IsNullOrWhiteSpace(stripeSignature))
            {
                context.Result = new BadRequestObjectResult(new { error = "Stripe-Signature header is missing" });
                return;
            }

            if (string.IsNullOrWhiteSpace(webhookSecret))
            {
                context.Result = new BadRequestObjectResult(new { error = "Webhook secret is not configured" });
                return;
            }

            context.HttpContext.Request.EnableBuffering();
            context.HttpContext.Request.Body.Position = 0;

            using var reader = new StreamReader(context.HttpContext.Request.Body, leaveOpen: true);
            var jsonPayload = await reader.ReadToEndAsync();

            if (string.IsNullOrWhiteSpace(jsonPayload))
            {
                context.Result = new BadRequestObjectResult(new { error = "Request body is empty" });
                return;
            }

            EventUtility.ConstructEvent(jsonPayload, stripeSignature, webhookSecret, throwOnApiVersionMismatch: false);

            var payload = JsonConvert.DeserializeObject<StripeEventPayload>(jsonPayload);

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
            await next();
        }
        catch (StripeException ex)
        {
            context.Result = new BadRequestObjectResult(new { error = $"Invalid Stripe signature: {ex.Message}" });
            return;
        }
        catch(Exception e)
        {
            var a = 32;
        }
    }
}
