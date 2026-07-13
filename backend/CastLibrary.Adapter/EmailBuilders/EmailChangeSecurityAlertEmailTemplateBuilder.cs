using CastLibrary.Shared.Domain;

namespace CastLibrary.Adapter.EmailBuilders;

public class EmailChangeSecurityAlertEmailTemplateBuilder : IEmailTemplateBuilder
{
    public bool IsMatch(Type type) => type == typeof(EmailChangeSecurityAlertEmailDomain);

    public SenderEmailRequest GenerateTemplateRequest(IEmailDomain emailData, string fromEmail, string fromName, string adminAddress)
    {
        var data = (EmailChangeSecurityAlertEmailDomain)emailData;
        return new SenderEmailRequest
        {
            From = new SenderRecipient { Email = fromEmail, Name = fromName },
            To = new SenderRecipient { Email = data.ToEmail, Name = data.DisplayName },
            Subject = "Security Alert: Your email address has been changed",
            Html = $"<p>Your email address was changed to <strong>{data.NewEmail}</strong> on {data.ChangedAt}.</p><p>If you didn't make this change, please contact support immediately.</p>"
        };
    }
}
