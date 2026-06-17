using CastLibrary.Shared.Domain;

namespace CastLibrary.Adapter.EmailBuilders;

public class CampaignInvitationEmailTemplateBuilder : IEmailTemplateBuilder
{
    public bool IsMatch(Type type) => type == typeof(CampaignInvitationEmailDomain);

    public SenderEmailRequest GenerateTemplateRequest(IEmailDomain emailData, string fromEmail, string fromName, string adminAddress)
    {
        var data = (CampaignInvitationEmailDomain)emailData;
        return new SenderEmailRequest
        {
            From = new SenderRecipient { Email = fromEmail, Name = fromName },
            To = new SenderRecipient { Email = data.ToEmail, Name = data.DisplayName },
            Subject = $"You're invited to join {data.CampaignName}!",
            Html = $"<p>You've been invited to join the campaign \"{data.CampaignName}\"!</p><p><a href=\"{data.InvitationLink}\">Accept Invitation</a></p>"
        };
    }
}
