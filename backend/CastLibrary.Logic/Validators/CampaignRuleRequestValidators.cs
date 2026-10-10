using FluentValidation;
using CastLibrary.Shared.Requests;

namespace CastLibrary.Logic.Validators;

public static class CampaignRuleRules
{
    public const int MaxNameLength = 200;
    public const int MaxDefinitionLength = 10000;
    public const int MaxChildren = 60;
    public const int MaxKeywords = 20;
    public const int MaxKeywordLength = 50;
    public const int MaxLinks = 200;
}

public class CreateCampaignRuleRequestValidator : AbstractValidator<CreateCampaignRuleRequest>
{
    public CreateCampaignRuleRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("A rule needs a name.")
            .MaximumLength(CampaignRuleRules.MaxNameLength);

        RuleFor(x => x.Definition)
            .MaximumLength(CampaignRuleRules.MaxDefinitionLength);

        RuleFor(x => x.Children)
            .Must(children => children.Count <= CampaignRuleRules.MaxChildren)
            .WithMessage($"A rule group holds at most {CampaignRuleRules.MaxChildren} rules.");

        RuleForEach(x => x.Children).ChildRules(child =>
        {
            child.RuleFor(c => c.Name)
                .NotEmpty().WithMessage("A rule in a group needs a name.")
                .MaximumLength(CampaignRuleRules.MaxNameLength);
            child.RuleFor(c => c.Definition).MaximumLength(CampaignRuleRules.MaxDefinitionLength);
        });

        RuleFor(x => x.Keywords)
            .Must(keywords => keywords.Count <= CampaignRuleRules.MaxKeywords)
            .WithMessage($"A rule carries at most {CampaignRuleRules.MaxKeywords} keywords.");

        RuleForEach(x => x.Keywords)
            .NotEmpty().MaximumLength(CampaignRuleRules.MaxKeywordLength);
    }
}

public class UpdateCampaignRuleRequestValidator : AbstractValidator<UpdateCampaignRuleRequest>
{
    public UpdateCampaignRuleRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("A rule needs a name.")
            .MaximumLength(CampaignRuleRules.MaxNameLength);

        RuleFor(x => x.Definition)
            .MaximumLength(CampaignRuleRules.MaxDefinitionLength);

        RuleFor(x => x.Children)
            .Must(children => children.Count <= CampaignRuleRules.MaxChildren)
            .WithMessage($"A rule group holds at most {CampaignRuleRules.MaxChildren} rules.");

        RuleForEach(x => x.Children).ChildRules(child =>
        {
            child.RuleFor(c => c.Name)
                .NotEmpty().WithMessage("A rule in a group needs a name.")
                .MaximumLength(CampaignRuleRules.MaxNameLength);
            child.RuleFor(c => c.Definition).MaximumLength(CampaignRuleRules.MaxDefinitionLength);
        });

        RuleFor(x => x.Keywords)
            .Must(keywords => keywords.Count <= CampaignRuleRules.MaxKeywords)
            .WithMessage($"A rule carries at most {CampaignRuleRules.MaxKeywords} keywords.");

        RuleForEach(x => x.Keywords)
            .NotEmpty().MaximumLength(CampaignRuleRules.MaxKeywordLength);
    }
}

public class LinkCampaignRulesRequestValidator : AbstractValidator<LinkCampaignRulesRequest>
{
    public LinkCampaignRulesRequestValidator()
    {
        RuleFor(x => x.RuleIds)
            .NotEmpty().WithMessage("Pick at least one rule to add to the campaign.")
            .Must(ids => ids.Count <= CampaignRuleRules.MaxLinks)
            .WithMessage($"At most {CampaignRuleRules.MaxLinks} rules can be added at once.");

        RuleForEach(x => x.RuleIds)
            .NotEmpty().WithMessage("A rule to add must name its id.");
    }
}
