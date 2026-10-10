import { Component, Input, OnDestroy, inject, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { JournalRandomizeService } from '../../../services/journal-randomize.service';

@Component({
  selector: 'app-journal-dropdown',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './journal-dropdown.component.html',
  styleUrl: './journal-dropdown.component.scss'
})
export class JournalDropdownComponent implements OnInit, OnDestroy {
  @Input() options: string[] = [];
  @Input() label: string = '';
  @Input() control: FormControl = new FormControl('');
  @Input() randomizeGroupId: string | null = null;
  @Input() disabled: boolean = false;
  /** When false the field is read-only: no typing, only a picked option lands in the control. */
  @Input() allowTyping: boolean = true;
  /**
   * Optional colour blocks, keyed by option value: each option wearing its own colour in the list,
   * and the picked one wearing its colour in the field. Left empty, no blocks are drawn.
   */
  @Input() swatches: Record<string, string> = {};

  /** The colour block the picked value wears, or null when this dropdown is not a colour one. */
  get selectedSwatch(): string | null {
    const value = this.control?.value as string | undefined;
    return value ? (this.swatches[value] ?? null) : null;
  }

  private randomizeService = inject(JournalRandomizeService);
  private subscription: Subscription | null = null;
  
  dropdownId = `journal-dropdown-${Math.random().toString(36).substr(2, 9)}`;
  filteredOptions: string[] = [];
  isDropdownVisible = false;

  ngOnInit(): void {
    this.filteredOptions = this.options;
    
    this.subscription = this.randomizeService.randomize$.subscribe((groupId) => {
      if (this.randomizeGroupId === groupId && this.options.length > 0) {
        const randomIndex = Math.floor(Math.random() * this.options.length);
        this.control.setValue(this.options[randomIndex]);
        this.filterOptions(this.options[randomIndex]);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  showDropdown(): void {
    this.isDropdownVisible = !this.isDropdownVisible;
    if (this.isDropdownVisible) {
      this.refreshOptions();
    }
  }

  toggleDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDropdownVisible = !this.isDropdownVisible;
    if (this.isDropdownVisible) {
      this.refreshOptions();
    }
  }

  /**
   * Readies the list as the panel opens. A read-only field has nothing to filter by, so it always
   * offers every option; a typeable one narrows to what has been typed into it so far.
   */
  private refreshOptions(): void {
    if (!this.allowTyping) {
      this.filteredOptions = this.options;
      return;
    }

    this.filterOptions(this.control.value);
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterOptions(value);
  }

  onBlur(): void {
    setTimeout(() => {
      this.isDropdownVisible = false;
    }, 200);
  }

  selectOption(option: string): void {
    this.control.setValue(option);
    this.isDropdownVisible = false;
  }

  private filterOptions(value: string): void {
    if (!value) {
      this.filteredOptions = this.options;
    } else {
      const lowerValue = value.toLowerCase();
      this.filteredOptions = this.options.filter(option => 
        option.toLowerCase().includes(lowerValue)
      );
    }
  }
}
