using CastLibrary.Shared.Domain;

namespace CastLibrary.Adapter.EmailBuilders;

public class AccountVerificationEmailTemplateBuilder : IEmailTemplateBuilder
{
    public bool IsMatch(Type type) => type == typeof(AccountVerificationEmailDomain);

    public SenderEmailRequest GenerateTemplateRequest(IEmailDomain emailData, string fromEmail, string fromName, string adminAddress)
    {
        var data = (AccountVerificationEmailDomain)emailData;
        return new SenderEmailRequest
        {
            From = new SenderRecipient { Email = fromEmail, Name = fromName },
            To = new SenderRecipient { Email = data.ToEmail, Name = data.DisplayName },
            Subject = $"Verify your email address",
            Html = $"<p>Click the link below to verify your email address:</p><p><a href=\"{data.VerificationLink}\">Verify Email</a></p>"
        };
    }
}
