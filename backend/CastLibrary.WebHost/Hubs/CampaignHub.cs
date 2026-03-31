using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace CastLibrary.WebHost.Hubs;

[Authorize]
public class CampaignHub : Hub
{
    public async Task JoinCampaign(string campaignId) =>
        await Groups.AddToGroupAsync(Context.ConnectionId, campaignId);

    public async Task LeaveCampaign(string campaignId) =>
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, campaignId);

    public async Task RevealSecret(string campaignId, string secretId) =>
        await Clients.Group(campaignId).SendAsync("SecretRevealed", new { secretId, campaignId });
}
