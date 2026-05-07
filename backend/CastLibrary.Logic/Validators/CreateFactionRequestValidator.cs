using FluentValidation;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Validators;

public class CreateFactionRequestValidator : AbstractValidator<CreateFactionRequest>
{
    public CreateFactionRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(255);
    }
}
