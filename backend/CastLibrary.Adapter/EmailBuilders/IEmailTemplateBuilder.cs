using CastLibrary.Shared.Domain;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Adapter.EmailBuilders;

public interface IEmailTemplateBuilder
{
    bool IsMatch(Type type);
    SenderEmailRequest GenerateTemplateRequest(IEmailDomain emailData, string fromEmail, string fromName, string adminAddress);
}
