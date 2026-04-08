using FluentValidation;
using CastLibrary.Shared.Requests;
namespace CastLibrary.Logic.Validators;

public class CreateLocationRequestValidator : AbstractValidator<CreateLocationRequest>
{
    public CreateLocationRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Classification).MaximumLength(100);
        RuleFor(x => x.Size).MaximumLength(50);
    }
}
