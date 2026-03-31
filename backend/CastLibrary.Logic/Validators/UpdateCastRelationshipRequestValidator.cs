using FluentValidation;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Validators;

public class UpdateCastRelationshipRequestValidator : AbstractValidator<UpdateCastRelationshipRequest>
{
    public UpdateCastRelationshipRequestValidator()
    {
        RuleFor(x => x.Value).InclusiveBetween(-5, 5);
        RuleFor(x => x.Explanation)
            .MaximumLength(1000)
            .When(x => x.Explanation is not null);
    }
}
