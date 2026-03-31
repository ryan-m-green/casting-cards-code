using FluentValidation;
using CastLibrary.Shared.Requests;
namespace CastLibrary.Logic.Validators;

public class CreateCampaignRequestValidator : AbstractValidator<CreateCampaignRequest>
{
    public CreateCampaignRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.FantasyType).MaximumLength(100);
    }
}
