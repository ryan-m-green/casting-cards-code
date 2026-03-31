using FluentValidation;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Validators;

public class UpsertCastPlayerNotesRequestValidator : AbstractValidator<UpsertCastPlayerNotesRequest>
{
    public UpsertCastPlayerNotesRequestValidator()
    {
        RuleFor(x => x.Want).MaximumLength(5000);
        RuleFor(x => x.Alignment).MaximumLength(30);
        RuleFor(x => x.Perception).InclusiveBetween(-5, 5);
        RuleFor(x => x.Rating).InclusiveBetween(0, 3);
    }
}
