export interface RuleDefinition {
  readonly id: string;
  readonly name: string;
  readonly definition: string;
}

export interface Rule {
  readonly id: string;
  readonly name: string;
  readonly definition: string;
  readonly children: readonly RuleDefinition[];
  readonly keywords: readonly string[];
}

export function newGuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, marker => {
    const random = (Math.random() * 16) | 0;
    const value = marker === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function emptyRuleDefinition(): RuleDefinition {
  return { id: newGuid(), name: '', definition: '' };
}

export function emptyRule(name = ''): Rule {
  return { id: newGuid(), name, definition: '', children: [], keywords: [] };
}

export function hasDefinition(definition: RuleDefinition): boolean {
  return definition.name.trim() !== '' || definition.definition.trim() !== '';
}

export function isRuleGroup(rule: Rule | null): boolean {
  return (rule?.children.length ?? 0) > 0;
}

export function ruleTerm(count: number): string {
  if (count === 0) return 'Entry';
  return count === 1 ? '1 entry' : `${count} entries`;
}
