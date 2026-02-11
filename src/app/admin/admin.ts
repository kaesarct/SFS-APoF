import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../data.service';
import { Auth, signOut, user } from '@angular/fire/auth';
import { Router } from '@angular/router';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin {
  private dataService = inject(DataService);
  private auth = inject(Auth);
  private router = inject(Router);

  user$ = user(this.auth);

  uploading = false;
  message = '';
  error = '';

  // New Management State
  loadingHistory = false;
  fullHistory: any[] = [];
  historyData: any[] = []; // Displayed Page

  // Pagination
  currentPage = 1;
  itemsPerPage = 50;

  newItem = {
    area: '',
    country: '',
    date: '',
    priceOriginal: 0,
    exchangeRate: 1,
    priceEuro: 0,
    weight: 750,
    gdp: 0,
    gdpYear: 2024
  };

  ngOnInit() {
    this.loadHistory();
  }

  async loadHistory() {
    this.loadingHistory = true;
    try {
      this.fullHistory = await this.dataService.getAdminHistory();
      this.updateTable();
    } catch (e) {
      console.error('Error loading history', e);
    } finally {
      this.loadingHistory = false;
    }
  }

  updateTable() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.historyData = this.fullHistory.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updateTable();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateTable();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.fullHistory.length / this.itemsPerPage);
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  // --- ACTIONS ---

  async onClearDatabase() {
    if (!confirm('SEI SICURO? Questo cancellerà TUTTA la cronologia e le classifiche. Questa azione è irreversibile.')) return;

    this.uploading = true;
    try {
      await this.dataService.clearDatabase();
      this.message = 'Database pulito con successo.';
      this.loadHistory();
    } catch (e: any) {
      this.error = 'Errore durante la pulizia: ' + e.message;
    } finally {
      this.uploading = false;
    }
  }

  async onAddItem() {
    if (!this.newItem.country || !this.newItem.date) return;

    this.uploading = true;
    try {
      await this.dataService.addRilevazione(this.newItem);
      this.message = 'Elemento aggiunto con successo.';

      // Reset form (keep some defaults)
      this.newItem = {
        area: '',
        country: '',
        date: '',
        priceOriginal: 0,
        exchangeRate: 1,
        priceEuro: 0,
        weight: 750,
        gdp: 0,
        gdpYear: 2024
      };
      this.loadHistory();
    } catch (e: any) {
      this.error = 'Errore aggiunta elemento: ' + e.message;
    } finally {
      this.uploading = false;
    }
  }

  async onDeleteItem(id: string) {
    if (!confirm('Eliminare questo elemento?')) return;

    try {
      await this.dataService.deleteHistoryItem(id);
      this.loadHistory(); // Reload list without showing big loading spinner usually
    } catch (e: any) {
      this.error = 'Errore eliminazione: ' + e.message;
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.uploading = true;
    this.message = '';
    this.error = '';

    try {
      const resultMessage = await this.dataService.parseAndUploadExcel(file);
      this.message = 'Successo! ' + resultMessage;
      this.loadHistory(); // Refresh table
    } catch (e: any) {
      console.error(e);
      this.error = 'Caricamento fallito: ' + (e.message || 'Errore sconosciuto');
    } finally {
      this.uploading = false;
      // Reset input
      event.target.value = '';
    }
  }
}
