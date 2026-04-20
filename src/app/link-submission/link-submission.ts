import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { DataService } from '../data.service';
import nutellaData from '../nutella-data.json';
import paesiIta from '../paesi-ita.json';
import itaToEng from '../ita-to-eng.json';

@Component({
  selector: 'app-data-submission',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './link-submission.html',
  styleUrl: './link-submission.css'
})
export class DataSubmission implements OnInit {
  private fb = inject(FormBuilder);
  private dataService = inject(DataService);

  countries = (paesiIta as string[]).sort();
  gdpData: any = nutellaData.gdp;

  nutellaIndexMinutes: number | null = null;
  valoreGdpEur: number | null = null;
  costo100g: number | null = null;

  form = this.fb.group({
    price: ['', [Validators.required, Validators.min(0)]],
    currency: ['EUR', Validators.required],
    euroPrice: [''],
    weight: ['750', Validators.required],
    city: ['', Validators.required],
    country: ['', Validators.required],
    userName: [''],
    file: [null as File | null],
    gdprConsent: [false, Validators.requiredTrue]
  });

  currencies = ['EUR', 'USD', 'GBP', 'CHF', 'PLN'];
  weights = [
    { label: '200g', value: 200 },
    { label: '450g', value: 450 },
    { label: '600g', value: 600 },
    { label: '630g', value: 630 },
    { label: '700g', value: 700 },
    { label: '750g', value: 750 },
    { label: '800g', value: 800 },
    { label: '825g', value: 825 },
    { label: '900g', value: 900 },
    { label: '1kg', value: 1000 }
  ];

  selectedFile: File | null = null;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit() {
    this.form.valueChanges.subscribe(() => {
        this.calculateIndex();
    });
  }

  calculateIndex() {
      const v = this.form.value;
      if (!v.price || !v.weight || !v.country) {
          this.nutellaIndexMinutes = null;
          return;
      }
      
      const priceLocal = parseFloat(v.price) || 0;
      let priceEuro = priceLocal;
      if (v.currency !== 'EUR') {
          priceEuro = parseFloat(v.euroPrice || '0') || 0;
      }

      if (priceEuro <= 0) {
          this.nutellaIndexMinutes = null;
          return;
      }

      const weight = parseFloat(v.weight) || 750;
      const engCountry = (itaToEng as any)[v.country] || v.country;
      const gdpObj = this.gdpData[engCountry];
      let gdp = 0;
      if (gdpObj) {
          let maxYear = 0;
          for (let key in gdpObj) {
             const year = parseInt(key);
             const val = gdpObj[key];
             if (!isNaN(year) && (typeof val === 'number' || !isNaN(parseFloat(val as string)))) {
                 if (year > maxYear && val !== 'no data') {
                     maxYear = year;
                     gdp = typeof val === 'string' ? parseFloat(val) : val;
                 }
             }
          }
      }

      if (gdp <= 0) {
          this.nutellaIndexMinutes = null;
          this.valoreGdpEur = null;
          this.costo100g = null;
          return;
      }
      
      this.valoreGdpEur = gdp;

      const var3 = (priceEuro / weight) * 100; // cost of 100g in Euro 
      this.costo100g = var3;
      const var4 = gdp;
      const var5 = (var3 / var4) * 2000;
      this.nutellaIndexMinutes = Math.round(var5 * 60 * 100) / 100;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.form.patchValue({ file: file });
    }
  }

  async onSubmit() {
    if (this.form.invalid || !this.selectedFile) {
      this.errorMessage = 'Compila tutti i campi e carica una foto.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      // 1. Upload Photo
      const photoUrl = await this.dataService.uploadPhoto(this.selectedFile);

      // 2. Submit Data
      const formData = {
        price: this.form.value.price,
        currency: this.form.value.currency,
        euroPrice: this.form.value.currency !== 'EUR' ? this.form.value.euroPrice : this.form.value.price,
        weight: this.form.value.weight,
        city: this.form.value.city,
        country: this.form.value.country,
        nome_utente: this.form.value.userName || '',
        photoUrl: photoUrl
      };

      await this.dataService.submitData(formData);

      this.successMessage = 'Grazie! I tuoi dati sono stati inviati con successo.';
      this.form.reset({ currency: 'EUR', weight: '750' });
      this.selectedFile = null;

    } catch (e) {
      console.error(e);
      this.errorMessage = 'Errore durante l\'invio. Riprova più tardi.';
    } finally {
      this.isSubmitting = false;
    }
  }
}
