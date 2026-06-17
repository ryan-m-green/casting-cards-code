using Microsoft.Extensions.Configuration;

namespace CastLibrary.Shared.Configuration
{
    public interface IEmailConfiguration
    {
        string ApiToken { get; }
        string FromEmail { get; }
        string FromName { get; }
        string FrontendBaseUrl { get; }
    }

    public class EmailConfiguration : IEmailConfiguration
    {
        public EmailConfiguration(IConfiguration configuration)
        {
            var emailSection = configuration.GetSection("Email");
            ApiToken = emailSection["ApiToken"] ?? throw new InvalidOperationException("Email:ApiToken not configured");
            FromEmail = emailSection["FromEmail"] ?? throw new InvalidOperationException("Email:FromEmail not configured");
            FromName = emailSection["FromName"] ?? throw new InvalidOperationException("Email:FromName not configured");
            FrontendBaseUrl = emailSection["FrontendBaseUrl"] ?? throw new InvalidOperationException("Email:FrontendBaseUrl not configured");
        }

        public string ApiToken { get; }
        public string FromEmail { get; }
        public string FromName { get; }
        public string FrontendBaseUrl { get; }
    }
}
