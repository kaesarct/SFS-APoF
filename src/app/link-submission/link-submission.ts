import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../data.service';

@Component({
  selector: 'app-link-submission',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './link-submission.html',
  styleUrl: './link-submission.css'
})
export class LinkSubmission {
  private fb = inject(FormBuilder);
  private dataService = inject(DataService);

  form = this.fb.group({
    url: ['', [Validators.required, Validators.pattern('https?://.+')]]
  });

  submitting = false;
  successMessage = '';
  errorMessage = '';

  async submit() {
    if (this.form.invalid) return;

    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    const url = this.form.value.url!;

    try {
      await this.dataService.submitLink(url);
      this.successMessage = 'Link inviato con successo! Abbiamo notificato il team.';
      this.form.reset();
    } catch (err) {
      console.error(err);
      this.errorMessage = 'Invio del link fallito. Riprova per favore.';
    } finally {
      this.submitting = false;
    }
  }
}
