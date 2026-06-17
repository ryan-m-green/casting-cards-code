using CastLibrary.Shared.Domain;

namespace CastLibrary.Adapter.EmailBuilders;

public interface IEmailTemplateBuilder
{
    bool IsMatch(Type type);
    SenderEmailRequest GenerateTemplateRequest(IEmailDomain emailData, string fromEmail, string fromName, string adminAddress);
}
