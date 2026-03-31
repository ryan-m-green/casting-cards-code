using FluentValidation;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Validators;

public class AddCastRelationshipRequestValidator : AbstractValidator<AddCastRelationshipRequest>
{
    public AddCastRelationshipRequestValidator()
    {
        RuleFor(x => x.SourceCastInstanceId).NotEmpty();
        RuleFor(x => x.TargetCastInstanceId).NotEmpty();
        RuleFor(x => x.TargetCastInstanceId)
            .NotEqual(x => x.SourceCastInstanceId)
            .WithMessage("A cast member cannot have a relationship with itself.");
        RuleFor(x => x.Value).InclusiveBetween(-5, 5);
        RuleFor(x => x.Explanation)
            .MaximumLength(1000)
            .When(x => x.Explanation is not null);
    }
}
