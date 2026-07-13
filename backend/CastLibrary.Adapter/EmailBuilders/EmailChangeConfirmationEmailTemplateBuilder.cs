using CastLibrary.Shared.Domain;

namespace CastLibrary.Adapter.EmailBuilders;

public class EmailChangeConfirmationEmailTemplateBuilder : IEmailTemplateBuilder
{
    public bool IsMatch(Type type) => type == typeof(EmailChangeConfirmationEmailDomain);

    public SenderEmailRequest GenerateTemplateRequest(IEmailDomain emailData, string fromEmail, string fromName, string adminAddress)
    {
        var data = (EmailChangeConfirmationEmailDomain)emailData;
        return new SenderEmailRequest
        {
            From = new SenderRecipient { Email = fromEmail, Name = fromName },
            To = new SenderRecipient { Email = data.ToEmail, Name = data.DisplayName },
            Subject = "Your email address has been successfully changed",
            Html = $"<p>Your email address has been successfully changed on {data.ChangedAt}.</p><p>If you didn't request this change, please contact support immediately.</p>"
        };
    }
}
