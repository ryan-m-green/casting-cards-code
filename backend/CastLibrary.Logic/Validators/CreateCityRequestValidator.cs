using FluentValidation;
using CastLibrary.Shared.Requests;
namespace CastLibrary.Logic.Validators;

public class CreateCityRequestValidator : AbstractValidator<CreateCityRequest>
{
    public CreateCityRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(255);
        RuleFor(x => x.Classification).MaximumLength(100);
        RuleFor(x => x.Size).MaximumLength(50);
    }
}
