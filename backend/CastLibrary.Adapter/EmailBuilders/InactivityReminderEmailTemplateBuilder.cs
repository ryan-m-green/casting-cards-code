using CastLibrary.Shared.Domain;

namespace CastLibrary.Adapter.EmailBuilders;

public class InactivityReminderEmailTemplateBuilder : IEmailTemplateBuilder
{
    public bool IsMatch(Type type) => type == typeof(InactivityReminderEmailDomain);

    public SenderEmailRequest GenerateTemplateRequest(IEmailDomain emailData, string fromEmail, string fromName, string adminAddress)
    {
        var data = (InactivityReminderEmailDomain)emailData;
        return new SenderEmailRequest
        {
            From = new SenderRecipient { Email = fromEmail, Name = fromName },
            To = new SenderRecipient { Email = data.ToEmail, Name = data.DisplayName },
            Subject = "Reminder: Log in to keep your free tier account",
            Html = $"<p>Hi {data.DisplayName},</p>" +
                   "<p>We noticed you haven't logged into your account in a while. Your account will be automatically deleted after 60 days of inactivity.</p>" +
                   "<p>Please log in to keep your account active:</p>" +
                   $"<p><a href=\"{data.LoginUrl}\">Log In</a></p>" +
                   "<p>If you don't want to keep your account, no action is needed.</p>"
        };
    }
}
