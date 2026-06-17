using CastLibrary.Shared.Domain;

namespace CastLibrary.Adapter.EmailBuilders;

public class WelcomeEmailTemplateBuilder : IEmailTemplateBuilder
{
    public bool IsMatch(Type type) => type == typeof(WelcomeEmailDomain);

    public SenderEmailRequest GenerateTemplateRequest(IEmailDomain emailData, string fromEmail, string fromName, string adminAddress)
    {
        var data = (WelcomeEmailDomain)emailData;
        return new SenderEmailRequest
        {
            From = new SenderRecipient { Email = fromEmail, Name = fromName },
            To = new SenderRecipient { Email = data.ToEmail, Name = data.DisplayName },
            Subject = $"Welcome to Casting Cards!",
            Html = $"<p>Welcome to Casting Cards, {data.Username}!</p><p>We're excited to have you on board.</p>"
        };
    }
}
