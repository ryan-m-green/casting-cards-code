using FluentValidation;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Validators;

public static class ConditionRules
{
    public const int MaxNameLength = 200;
    public const int MaxConsequenceLength = 10000;
    public const int MaxKeywords = 20;
    public const int MaxKeywordLength = 50;
    public const int MaxLinks = 200;
    public const string ColorPattern = "^#[0-9a-fA-F]{6}$";
}

public class CreateConditionRequestValidator : AbstractValidator<CreateConditionRequest>
{
    public CreateConditionRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("A condition needs a name.")
            .MaximumLength(ConditionRules.MaxNameLength);

        RuleFor(x => x.Consequence)
            .MaximumLength(ConditionRules.MaxConsequenceLength);

        RuleFor(x => x.Color)
            .Matches(ConditionRules.ColorPattern)
            .WithMessage("A condition's colour must be a hex colour such as #8bc34a.")
            .When(x => !string.IsNullOrWhiteSpace(x.Color));

        RuleFor(x => x.Keywords)
            .Must(keywords => keywords.Count <= ConditionRules.MaxKeywords)
            .WithMessage($"A condition carries at most {ConditionRules.MaxKeywords} keywords.");

        RuleForEach(x => x.Keywords)
            .NotEmpty().MaximumLength(ConditionRules.MaxKeywordLength);
    }
}

public class UpdateConditionRequestValidator : AbstractValidator<UpdateConditionRequest>
{
    public UpdateConditionRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("A condition needs a name.")
            .MaximumLength(ConditionRules.MaxNameLength);

        RuleFor(x => x.Consequence)
            .MaximumLength(ConditionRules.MaxConsequenceLength);

        RuleFor(x => x.Color)
            .Matches(ConditionRules.ColorPattern)
            .WithMessage("A condition's colour must be a hex colour such as #8bc34a.")
            .When(x => !string.IsNullOrWhiteSpace(x.Color));

        RuleFor(x => x.Keywords)
            .Must(keywords => keywords.Count <= ConditionRules.MaxKeywords)
            .WithMessage($"A condition carries at most {ConditionRules.MaxKeywords} keywords.");

        RuleForEach(x => x.Keywords)
            .NotEmpty().MaximumLength(ConditionRules.MaxKeywordLength);
    }
}

public class LinkConditionsRequestValidator : AbstractValidator<LinkConditionsRequest>
{
    public LinkConditionsRequestValidator()
    {
        RuleFor(x => x.ConditionIds)
            .NotEmpty().WithMessage("Pick at least one condition to add to the campaign.")
            .Must(ids => ids.Count <= ConditionRules.MaxLinks)
            .WithMessage($"At most {ConditionRules.MaxLinks} conditions can be added at once.");

        RuleForEach(x => x.ConditionIds)
            .NotEmpty().WithMessage("A condition to add must name its id.");
    }
}
