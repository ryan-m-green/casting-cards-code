using CastLibrary.Logic.Commands.Stripe;
using CastLibrary.Logic.Interfaces;
using CastLibrary.Shared.Configuration;
using CastLibrary.Shared.Domain;
using CastLibrary.WebHost.Filters;
using CastLibrary.WebHost.Hubs;
using CastLibrary.WebHost.MetadataHelpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Controllers;

[ApiController]
[Route("api/stripe")]
public class StripeController(
    ICreateCheckoutSessionCommandHandler createCheckoutSessionCommand,
    IProcessStripeWebhookCommandHandler webhookHandler,
    ICreateCustomerPortalSessionCommandHandler createCustomerPortalSessionCommand,
    IUserRetriever userRetriever,
    IHubContext<CampaignHub> hubContext,
    IStripeConfiguration stripeConfiguration,
    ILoggingService loggingService) : ControllerBase
{
    [Authorize]
    [HttpPost("create-checkout-session")]
    [EnableRateLimiting("GeneralApi")]
    public async Task<IActionResult> CreateCheckoutSession()
    {
        var userId = userRetriever.GetUserId(User);
        var successUrl = stripeConfiguration.SuccessUrl;
        var cancelUrl = stripeConfiguration.CancelUrl;

        var checkoutUrl = await createCheckoutSessionCommand.HandleAsync(new CreateCheckoutSessionCommand(
            userId,
            successUrl,
            cancelUrl
        ));

        return Ok(new { checkoutUrl });
    }

    [Authorize]
    [HttpPost("create-customer-portal-session")]
    [EnableRateLimiting("GeneralApi")]
    public async Task<IActionResult> CreateCustomerPortalSession()
    {
        var userId = userRetriever.GetUserId(User);
        var returnUrl = stripeConfiguration.ReturnUrl;

        var portalUrl = await createCustomerPortalSessionCommand.HandleAsync(new CreateCustomerPortalSessionCommand(
            userId,
            returnUrl
        ));

        return Ok(new { portalUrl });
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    [StripeWebhookSecurityFilter]
    public async Task<IActionResult> Webhook()
    {
        loggingService.LogInformation("StripeController.Webhook: Entry - Processing Stripe webhook");
        try
        {
            var payload = (StripeEventPayload)HttpContext.Items["StripePayload"];
            var eventType = payload.Type;

            loggingService.LogInformation($"StripeController.Webhook: Received event type {eventType} with ID {payload.Id}");

            payload.Callback = (userId, lockLevel) => NotifySubscriptionLockLevelChanged(userId, lockLevel);

            var command = new ProcessStripeWebhookCommand(payload);
            await webhookHandler.HandleAsync(command);

            loggingService.LogInformation($"StripeController.Webhook: Exit - Successfully processed webhook event {eventType}");
            return Ok();
        }
        catch (Exception ex)
        {
            loggingService.LogError($"StripeController.Webhook: Exit - Error processing webhook: {ex.Message}");
            throw;
        }
    }

    private void NotifySubscriptionLockLevelChanged(Guid userId, string newLockLevel)
    {
        try
        {
            loggingService.LogInformation($"StripeController: Sending SignalR SubscriptionLockLevelChanged event to user {userId} with lock level {newLockLevel}");
            hubContext.Clients.User(userId.ToString())
                .SendAsync("SubscriptionLockLevelChanged", new { userId = userId, newLockLevel }).GetAwaiter().GetResult();
            loggingService.LogInformation($"StripeController: Successfully sent SignalR SubscriptionLockLevelChanged event to user {userId}");
        }
        catch (Exception ex)
        {
            loggingService.LogError($"StripeController: Failed to send SignalR SubscriptionLockLevelChanged event to user {userId}: {ex.Message}");
        }
    }

}