using FluentValidation;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Validators;

/// <summary>
/// What a queued note's linked cards are held to, shared by the create and update validators: a
/// note wears its links as hashtags, and a queue line that could carry hundreds of them would be
/// a line the area could not draw (see the quicknotes area's own chips).
/// </summary>
public static class QuicknoteQueueLinkRules
{
    /// <summary>The most cards one queued note may be linked to.</summary>
    public const int MaxLinks = 50;
}

public class CreateQuicknoteQueueItemRequestValidator : AbstractValidator<CreateQuicknoteQueueItemRequest>
{
    public CreateQuicknoteQueueItemRequestValidator()
    {
        RuleFor(x => x.Content).NotEmpty().MaximumLength(5000);

        RuleFor(x => x.LinkedEntities)
            .Must(links => links.Count <= QuicknoteQueueLinkRules.MaxLinks)
            .WithMessage($"A quicknote may be linked to at most {QuicknoteQueueLinkRules.MaxLinks} cards.");

        RuleForEach(x => x.LinkedEntities).ChildRules(link =>
        {
            link.RuleFor(l => l.EntityType).NotEmpty().WithMessage("A linked card must name its type.");
            link.RuleFor(l => l.EntityId).NotEmpty().WithMessage("A linked card must name its id.");
        });
    }
}
