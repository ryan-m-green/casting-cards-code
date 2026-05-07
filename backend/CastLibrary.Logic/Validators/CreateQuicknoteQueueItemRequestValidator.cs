using FluentValidation;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Validators;

public class CreateQuicknoteQueueItemRequestValidator : AbstractValidator<CreateQuicknoteQueueItemRequest>
{
    public CreateQuicknoteQueueItemRequestValidator()
    {
        RuleFor(x => x.Content).NotEmpty().MaximumLength(5000);
    }
}
