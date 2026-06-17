using CastLibrary.Adapter.Operators;
using CastLibrary.Shared.Domain;

namespace CastLibrary.Logic.Services;

public class EmailService(IEmailOperator emailOperator) : IEmailService
{
    public async Task<bool> SendInactivityReminderEmailAsync(string email, string displayName, string loginUrl)
    {
        try
        {
            var emailData = new InactivityReminderEmailDomain
            {
                ToEmail = email,
                DisplayName = displayName,
                LoginUrl = loginUrl
            };

            await emailOperator.SendEmailAsync(emailData);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
