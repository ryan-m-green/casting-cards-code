using FluentValidation;
using CastLibrary.Shared.Requests;
namespace CastLibrary.Logic.Validators;

public class CreateCastRequestValidator : AbstractValidator<CreateCastRequest>
{
    public CreateCastRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Race).MaximumLength(100);
        RuleFor(x => x.Role).MaximumLength(100);
        RuleFor(x => x.Age).MaximumLength(20);
        RuleFor(x => x.Alignment).MaximumLength(100);
    }
}
