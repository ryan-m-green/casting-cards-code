import { Component, input, signal, forwardRef, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CcTextboxComponent } from '../cc-textbox/cc-textbox.component';

export interface ShopItemData {
  name: string;
  priceAmount: number | null;
  priceCurrencyType: string;
  description: string;
}

@Component({
  selector: 'cc-shop-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, CcTextboxComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CcShopInventoryComponent),
      multi: true
    }
  ],
  templateUrl: './cc-shop-inventory.component.html',
  styleUrl: './cc-shop-inventory.component.scss'
})
export class CcShopInventoryComponent implements ControlValueAccessor {
  readonly label = input<string>('Shop Inventory');
  readonly placeholder = input<string>(''); // Placeholder for the textarea
  readonly spaced = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly rows = input<number>(8);
  readonly context = input<'journal' | 'campaign'>('journal');

  isCampaignContext = computed(() => this.context() === 'campaign');

  readonly currencyOptions = [
    { value: 'cp', label: 'Copper' },
    { value: 'sp', label: 'Silver' },
    { value: 'ep', label: 'Electrum' },
    { value: 'gp', label: 'Gold' },
    { value: 'pp', label: 'Platinum' }
  ];

  @ViewChild(CcTextboxComponent) textbox!: CcTextboxComponent;

  private currencyNameMap: Record<string, string> = {
    'copper': 'cp',
    'silver': 'sp', 
    'electrum': 'ep',
    'gold': 'gp',
    'platinum': 'pp',
    'copper pieces': 'cp',
    'silver pieces': 'sp', 
    'electrum pieces': 'ep',
    'gold pieces': 'gp',
    'platinum pieces': 'pp',
    'cp': 'cp',
    'sp': 'sp',
    'ep': 'ep',
    'gp': 'gp',
    'pp': 'pp'
  };

  inventoryText = signal<string>('');

  hasCoinTypeValue = computed(() => {
    const text = this.inventoryText();
    
    // Find the last "Coin Type:" or "Coin:" occurrence
    const coinTypeRegex = /coin type:\s*$/i;
    const coinRegex = /coin:\s*$/i;
    
    let lastMatchIndex = -1;
    let matchLength = 0;
    
    // Check for "Coin Type:" first
    let match;
    const coinTypeRegexGlobal = new RegExp(coinTypeRegex.source, 'gi');
    while ((match = coinTypeRegexGlobal.exec(text)) !== null) {
      lastMatchIndex = match.index;
      matchLength = match[0].length;
    }
    
    // If no "Coin Type:" found, check for "Coin:"
    if (lastMatchIndex === -1) {
      const coinRegexGlobal = new RegExp(coinRegex.source, 'gi');
      while ((match = coinRegexGlobal.exec(text)) !== null) {
        lastMatchIndex = match.index;
        matchLength = match[0].length;
      }
    }
    
    if (lastMatchIndex !== -1) {
      // Check if there's already content after "Coin Type:"
      const insertPosition = lastMatchIndex + matchLength;
      const afterCoinType = text.substring(insertPosition).trim();
      return afterCoinType.length > 0;
    }
    
    return false;
  });

  dynamicPlaceholder = computed(() => {
    return `Name: Iron Sword\nDescription: Well-balanced blade\nPrice: 15\nCoin Type: gp\n\nName: Health Potion\nDescription: Restores 10 HP\nPrice: 50\nCoin Type: sp`;
  });

  private onChange: (value: ShopItemData[]) => void = () => {};
  onTouched: () => void = () => {};

  onTextChange(newValue: string): void {
    this.inventoryText.set(newValue);
    this.onChange(this.parseTextToItems(newValue));
    this.onTouched();
  }

  onAddItem(): void {
    const template = `\n\nName: \nDescription: \nPrice: \nCoin Type: `;
    const currentText = this.inventoryText();
    const newText = currentText.trim() ? currentText + template : template.trim();
    this.inventoryText.set(newText);
    this.onChange(this.parseTextToItems(newText));
    this.onTouched();
  }

  insertCurrency(currency: string): void {
    const currentText = this.inventoryText();
    
    // Find the last "Coin Type:" or "Coin:" occurrence
    const coinTypeRegex = /coin type:\s*$/i;
    const coinRegex = /coin:\s*$/i;
    
    let lastMatchIndex = -1;
    let matchLength = 0;
    
    // Check for "Coin Type:" first
    let match;
    const coinTypeRegexGlobal = new RegExp(coinTypeRegex.source, 'gi');
    while ((match = coinTypeRegexGlobal.exec(currentText)) !== null) {
      lastMatchIndex = match.index;
      matchLength = match[0].length;
    }
    
    // If no "Coin Type:" found, check for "Coin:"
    if (lastMatchIndex === -1) {
      const coinRegexGlobal = new RegExp(coinRegex.source, 'gi');
      while ((match = coinRegexGlobal.exec(currentText)) !== null) {
        lastMatchIndex = match.index;
        matchLength = match[0].length;
      }
    }
    
    let newText: string;
    if (lastMatchIndex !== -1) {
      // Insert after the last match
      const insertPosition = lastMatchIndex + matchLength;
      newText = currentText.substring(0, insertPosition) + currency + currentText.substring(insertPosition);
    } else {
      // No "Coin Type:" found, append to end
      newText = currentText + (currentText.trim() ? ' ' : '') + currency;
    }
    
    this.inventoryText.set(newText);
    this.onChange(this.parseTextToItems(newText));
    this.onTouched();
    
    // Focus the textbox
    setTimeout(() => {
      if (this.textbox) {
        // Try to focus the textbox
        const textareaElement = this.textbox as any;
        if (textareaElement.focus) {
          textareaElement.focus();
        }
      }
    }, 0);
  }

  private parseTextToItems(text: string): ShopItemData[] {
    const items: ShopItemData[] = [];
    if (!text.trim()) return items;

    // Split by blank lines to get individual items
    const itemBlocks = text.split(/\n\s*\n/);

    for (const block of itemBlocks) {
      if (!block.trim()) continue;

      // Find all property positions using regex
      const propertyPattern = /(name|description|price|coin type|coin):\s*/gi;
      const matches: Array<{index: number, property: string, length: number}> = [];
      
      let match;
      while ((match = propertyPattern.exec(block)) !== null) {
        matches.push({
          index: match.index,
          property: match[1].toLowerCase(),
          length: match[0].length
        });
      }

      if (matches.length === 0) continue;

      // Extract content between properties
      const properties: Record<string, string> = {};
      
      for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const startIndex = currentMatch.index + currentMatch.length;
        const endIndex = i < matches.length - 1 ? matches[i + 1].index : block.length;
        
        let content = block.substring(startIndex, endIndex).trim();
        
        // Clean up content - remove extra whitespace and line breaks
        content = content.replace(/\s+/g, ' ').trim();
        
        properties[currentMatch.property] = content;
      }

      // Map to ShopItemData structure
      let name = properties['name'] || '';
      let description = properties['description'] || '';
      let priceAmount: number | null = null;
      let priceCurrencyType = 'gp';

      // Parse price
      const priceText = properties['price'] || '';
      const priceMatch = priceText.match(/^(\d+)(\s+(cp|sp|ep|gp|pp))?$/i);
      if (priceMatch) {
        priceAmount = parseInt(priceMatch[1], 10);
        if (priceMatch[3]) {
          priceCurrencyType = priceMatch[3].toLowerCase();
        }
      }

      // Parse coin type if present
      const coinText = properties['coin type'] || properties['coin'] || '';
      if (coinText) {
        const normalizedCurrency = coinText.toLowerCase();
        if (this.currencyNameMap[normalizedCurrency]) {
          priceCurrencyType = this.currencyNameMap[normalizedCurrency];
        }
      }

      items.push({
        name,
        priceAmount,
        priceCurrencyType,
        description
      });
    }

    return items;
  }

  private itemsToText(items: ShopItemData[]): string {
    return items.map(item => {
      const lines = [`Name: ${item.name}`];
      if (item.description) {
        lines.push(`Description: ${item.description}`);
      }
      if (item.priceAmount !== null) {
        lines.push(`Price: ${item.priceAmount}`);
      }
      lines.push(`Coin Type: ${item.priceCurrencyType}`);
      return lines.join('\n');
    }).join('\n\n');
  }

  writeValue(value: ShopItemData[]): void {
    if (value && Array.isArray(value)) {
      this.inventoryText.set(this.itemsToText(value));
    } else {
      this.inventoryText.set('');
    }
  }

  registerOnChange(fn: (value: ShopItemData[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    // Handled via disabled input
  }
}