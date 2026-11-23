import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PriceTier, findMatchingTier } from '../shared/tiers';
import { FALLBACK_ITALY_REFERENCE } from '../shared/nutella-math';
import { DataService } from '../data.service';

@Component({
  selector: 'app-equivalency',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DecimalPipe],
  templateUrl: './equivalency.html',
  styleUrl: './equivalency.css'
})
export class EquivalencyPage implements OnInit {
  private dataService = inject(DataService);
  protected italyRef = signal(FALLBACK_ITALY_REFERENCE);

  // Form Binding
  inputMinutes: number | null = null;
  selectedCountryObj: any | null = null;

  // Calculated Results
  calculatedEuroValue: number = 0;
  calculatedNutellaGrams: number = 0;
  matchedTier: PriceTier | null = null;

  constructor(private decimalPipe: DecimalPipe) {}

  ngOnInit() {
    this.dataService.getItalyReference().then(ref => {
      this.italyRef.set(ref);
      this.calculateEquivalency();
    });
  }

  calculateEquivalency() {
    if (this.inputMinutes === null || this.inputMinutes <= 0) {
      this.clearResults();
      return;
    }

    // Mathematical calculations
    this.calculatedEuroValue = this.inputMinutes * this.italyRef().wagePerMinute;
    this.calculatedNutellaGrams = (this.inputMinutes / this.italyRef().minutesPer100g) * 100;

    // Item matching
    this.matchedTier = findMatchingTier(this.calculatedEuroValue);
  }

  clearResults() {
    this.calculatedEuroValue = 0;
    this.calculatedNutellaGrams = 0;
    this.matchedTier = null;
  }
}
