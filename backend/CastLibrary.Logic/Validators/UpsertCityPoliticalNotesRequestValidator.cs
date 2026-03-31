using FluentValidation;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Validators;

public class UpsertCityPoliticalNotesRequestValidator : AbstractValidator<UpsertCityPoliticalNotesRequest>
{
    private static readonly string[] ValidFactionTypes =
        ["Official", "Guild", "Church", "Criminal", "Shadow", "Military"];

    private static readonly string[] ValidRelationshipTypes =
        ["Allied", "Rival", "Enemy", "Neutral", "Blackmail", "Patronage"];

    private static readonly string[] ValidRoles =
        ["Ruler", "Member", "Agent", "Target"];

    private static readonly string[] ValidMotivations =
        ["Ambition", "Fear", "Loyalty", "Greed", "Survival"];

    public UpsertCityPoliticalNotesRequestValidator()
    {
        RuleFor(x => x.GeneralNotes).MaximumLength(10000);

        RuleForEach(x => x.Factions).ChildRules(f =>
        {
            f.RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
            f.RuleFor(x => x.Type).Must(t => ValidFactionTypes.Contains(t))
                .WithMessage("Invalid faction type.");
            f.RuleFor(x => x.Influence).InclusiveBetween(0, 10);
        });

        RuleForEach(x => x.Relationships).ChildRules(r =>
        {
            r.RuleFor(x => x.RelationshipType).Must(t => ValidRelationshipTypes.Contains(t))
                .WithMessage("Invalid relationship type.");
            r.RuleFor(x => x.Strength).InclusiveBetween(1, 5);
            r.RuleFor(x => x.Notes).MaximumLength(500);
            r.RuleFor(x => x.FactionAId).NotEmpty();
            r.RuleFor(x => x.FactionBId).NotEmpty();
        });

        RuleForEach(x => x.NpcRoles).ChildRules(n =>
        {
            n.RuleFor(x => x.Role).Must(r => ValidRoles.Contains(r))
                .WithMessage("Invalid NPC role.");
            n.RuleFor(x => x.Motivation).Must(m => ValidMotivations.Contains(m))
                .WithMessage("Invalid motivation.");
            n.RuleFor(x => x.CastInstanceId).NotEmpty();
            n.RuleFor(x => x.FactionId).NotEmpty();
        });
    }
}
