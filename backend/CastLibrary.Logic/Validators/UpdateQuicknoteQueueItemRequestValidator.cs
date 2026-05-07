using FluentValidation;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Validators;

public class UpdateQuicknoteQueueItemRequestValidator : AbstractValidator<UpdateQuicknoteQueueItemRequest>
{
    public UpdateQuicknoteQueueItemRequestValidator()
    {
        RuleFor(x => x.Content).NotEmpty().MaximumLength(5000);
    }
}
