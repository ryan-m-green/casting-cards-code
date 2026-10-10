using FluentValidation;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Validators;

public class UpdateQuicknoteQueueItemRequestValidator : AbstractValidator<UpdateQuicknoteQueueItemRequest>
{
    public UpdateQuicknoteQueueItemRequestValidator()
    {
        RuleFor(x => x.Content).NotEmpty().MaximumLength(5000);

        RuleFor(x => x.LinkedEntities)
            .Must(links => links is null || links.Count <= QuicknoteQueueLinkRules.MaxLinks)
            .WithMessage($"A quicknote may be linked to at most {QuicknoteQueueLinkRules.MaxLinks} cards.");

        RuleForEach(x => x.LinkedEntities).ChildRules(link =>
        {
            link.RuleFor(l => l.EntityType).NotEmpty().WithMessage("A linked card must name its type.");
            link.RuleFor(l => l.EntityId).NotEmpty().WithMessage("A linked card must name its id.");
        });
    }
}
