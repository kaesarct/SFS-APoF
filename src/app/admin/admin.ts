import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../data.service';
import { Auth, signOut, user, updatePassword } from '@angular/fire/auth';
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
  private cd = inject(ChangeDetectorRef);

  user$ = user(this.auth);

  uploading = false;
  message = '';
  error = '';

  // Password Change
  showPasswordModal = false;
  newPassword = '';

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

  // Editing State
  editingItem: any | null = null;
  editingId: string | null = null;



  ngOnInit() {
    this.loadHistory();
  }

  async loadHistory() {
    console.log('Admin: loadHistory started');
    this.loadingHistory = true;
    this.error = '';

    // Timeout promise (10 seconds)
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout caricamento dati (10s)')), 10000)
    );

    try {
      // Race between fetch and timeout
      console.log('Admin: Calling getAdminHistory...');
      this.fullHistory = await Promise.race([
        this.dataService.getAdminHistory(),
        timeout
      ]) as any[];
      console.log('Admin: getAdminHistory returned', this.fullHistory?.length);

      this.updateTable();
      console.log('Admin: Table updated');
    } catch (e: any) {
      console.error('Error loading history', e);
      this.error = 'Errore caricamento: ' + (e.message || 'Errore sconosciuto');
    } finally {
      console.log('Admin: Finally block - setting loadingHistory to false');
      this.loadingHistory = false;
      this.cd.detectChanges(); // Force UI update
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

  togglePasswordModal() {
    this.showPasswordModal = !this.showPasswordModal;
    this.newPassword = '';
    this.error = '';
    this.message = '';
  }

  async onChangePassword() {
    if (!this.newPassword || this.newPassword.length < 6) {
      this.error = 'La password deve avere almeno 6 caratteri.';
      return;
    }

    const currentUser = this.auth.currentUser;
    if (!currentUser) return;

    this.uploading = true;
    this.error = '';
    this.message = '';

    try {
      await updatePassword(currentUser, this.newPassword);
      this.message = 'Password aggiornata con successo!';
      setTimeout(() => this.togglePasswordModal(), 1500);
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/requires-recent-login') {
        this.error = 'Per sicurezza, devi rifare il login prima di cambiare la password.';
      } else {
        this.error = 'Errore aggiornamento password: ' + e.message;
      }
    } finally {
      this.uploading = false;
    }
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

  onEdit(item: any) {
    this.editingId = item.paese_id + '_' + item.data_video;
    this.editingItem = {
      area: item.area,
      country: item.paese,
      date: item.data_video,
      priceOriginal: item.prezzo_originale,
      exchangeRate: item.tasso_cambio,
      priceEuro: item.prezzo_euro,
      weight: item.peso_grammi,
      gdp: item.pil_pro_capite_eur,
      gdpYear: item.anno_pil
    };
  }

  cancelEdit() {
    this.editingItem = null;
    this.editingId = null;
  }

  async saveEdit() {
    if (!this.editingItem) return;

    this.uploading = true;
    try {
      const cleanId = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      const newId = `${cleanId(this.editingItem.country)}_${this.editingItem.date}`;

      // If Primary Key changed, delete old record
      if (this.editingId && newId !== this.editingId) {
        await this.dataService.deleteHistoryItem(this.editingId);
      }

      await this.dataService.addRilevazione(this.editingItem);

      this.message = 'Modifica salvata con successo.';
      this.editingItem = null;
      this.editingId = null;
      this.loadHistory();
    } catch (e: any) {
      console.error(e);
      this.error = 'Errore salvataggio: ' + e.message;
    } finally {
      this.uploading = false;
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
