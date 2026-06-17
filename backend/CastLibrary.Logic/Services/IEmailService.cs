namespace CastLibrary.Logic.Services;

public interface IEmailService
{
    Task<bool> SendInactivityReminderEmailAsync(string email, string displayName, string loginUrl);
}
