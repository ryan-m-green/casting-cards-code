using CastLibrary.Shared.Domain;

namespace CastLibrary.Adapter.EmailBuilders;

public class PasswordResetEmailTemplateBuilder : IEmailTemplateBuilder
{
    public bool IsMatch(Type type) => type == typeof(PasswordResetEmailDomain);

    public SenderEmailRequest GenerateTemplateRequest(IEmailDomain emailData, string fromEmail, string fromName, string adminAddress)
    {
        var data = (PasswordResetEmailDomain)emailData;
        return new SenderEmailRequest
        {
            From = new SenderRecipient { Email = fromEmail, Name = fromName },
            To = new SenderRecipient { Email = data.ToEmail, Name = data.DisplayName },
            Subject = $"Reset your password",
            Html = $"<p>Click the link below to reset your password:</p><p><a href=\"{data.ResetLink}\">Reset Password</a></p>"
        };
    }
}
