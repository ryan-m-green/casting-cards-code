using FluentValidation;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Validators;

public class CreateCampaignEventRequestValidator : AbstractValidator<CreateCampaignEventRequest>
{
    public CreateCampaignEventRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Body).NotEmpty().MaximumLength(50000);
    }
}
