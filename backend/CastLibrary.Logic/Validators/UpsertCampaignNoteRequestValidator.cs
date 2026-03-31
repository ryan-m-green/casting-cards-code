using FluentValidation;
using CastLibrary.Shared.Requests;
namespace CastLibrary.Logic.Validators;

public class UpsertCampaignNoteRequestValidator : AbstractValidator<UpsertCampaignNoteRequest>
{
    public UpsertCampaignNoteRequestValidator()
    {
        RuleFor(x => x.Content).NotEmpty().MaximumLength(5000);
        RuleFor(x => x.InstanceId).NotEmpty();
    }
}
