import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, Rilevazione, PaeseConfig } from '../data.service';
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

  // Password
  showPasswordModal = false;
  newPassword = '';

  // Rilevazioni
  loadingRilevazioni = false;
  rilevazioni: Rilevazione[] = [];
  rilevazioniFiltered: Rilevazione[] = [];
  rilevazioniSearch = '';
  editingRilevazione: Rilevazione | null = null;
  newRilevazione: Rilevazione = this.emptyRilevazione();

  // Paesi Config
  loadingPaesi = false;
  paesiConfig: PaeseConfig[] = [];
  paesiConfigFiltered: PaeseConfig[] = [];
  paesiSearch = '';
  editingPaese: PaeseConfig | null = null;
  newPaese: PaeseConfig = this.emptyPaese();

  ngOnInit() {
    this.loadRilevazioni();
    this.loadPaesiConfig();
  }

  emptyRilevazione(): Rilevazione {
    return { paese_en: '', paese_it: '', area: '', data_video: '', prezzo_originale: 0, tasso_cambio: 1, prezzo_euro: 0, peso_grammi: 750, euro_per_100g: 0, pil_pro_capite_eur: 0, anno_pil: 2024, minutes_per_100g: 0, is_human_safari: false, nome_utente: '', photo_url: '' };
  }

  emptyPaese(): PaeseConfig {
    return { paese_en: '', paese_it: '', currency: '', currency_code: '', exchange_rate: 1 };
  }

  // --- RILEVAZIONI ---

  async loadRilevazioni() {
    this.loadingRilevazioni = true;
    try {
      this.rilevazioni = await this.dataService.getRilevazioni();
      this.rilevazioni.sort((a, b) => (b.data_video || '').localeCompare(a.data_video || ''));
      this.filterRilevazioni();
    } catch (e: any) {
      this.error = 'Errore caricamento rilevazioni: ' + e.message;
    } finally {
      this.loadingRilevazioni = false;
      this.cd.detectChanges();
    }
  }

  filterRilevazioni() {
    const q = this.rilevazioniSearch.toLowerCase();
    this.rilevazioniFiltered = q
      ? this.rilevazioni.filter(r => r.paese_it?.toLowerCase().includes(q) || r.paese_en?.toLowerCase().includes(q))
      : [...this.rilevazioni];
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    this.uploading = true;
    this.message = '';
    this.error = '';
    try {
      const msg = await this.dataService.importRilevazioniFromExcel(file);
      this.message = msg;
      this.loadRilevazioni();
    } catch (e: any) {
      this.error = 'Errore: ' + (e.message || 'Errore sconosciuto');
    } finally {
      this.uploading = false;
      event.target.value = '';
    }
  }

  async onAddRilevazione() {
    if (!this.newRilevazione.paese_en || !this.newRilevazione.data_video) return;
    this.uploading = true;
    try {
      await this.dataService.saveRilevazione(this.newRilevazione);
      this.message = 'Rilevazione aggiunta.';
      this.newRilevazione = this.emptyRilevazione();
      this.loadRilevazioni();
    } catch (e: any) { this.error = e.message; } finally { this.uploading = false; }
  }

  onEditRilevazione(r: Rilevazione) { this.editingRilevazione = { ...r }; }
  cancelEditRilevazione() { this.editingRilevazione = null; }

  async saveRilevazioneEdit() {
    if (!this.editingRilevazione) return;
    this.uploading = true;
    try {
      await this.dataService.saveRilevazione(this.editingRilevazione);
      this.message = 'Rilevazione aggiornata.';
      this.editingRilevazione = null;
      this.loadRilevazioni();
    } catch (e: any) { this.error = e.message; } finally { this.uploading = false; }
  }

  async onDeleteRilevazione(id: string) {
    if (!confirm('Eliminare questa rilevazione?')) return;
    try {
      await this.dataService.deleteRilevazione(id);
      this.loadRilevazioni();
    } catch (e: any) { this.error = e.message; }
  }

  async onRecalculateAll() {
    if (!confirm('Salvare i calcoli di Euro/100g e Min/100g sul database per queste rilevazioni?')) return;
    this.uploading = true;
    try {
      const updates = this.rilevazioni.filter(r => !!r.id).map(r => ({
        id: r.id!, 
        euro: r.euro_per_100g, 
        min: r.minutes_per_100g
      }));
      await this.dataService.updateRilevazioniCalculations(updates);
      this.message = `Calcoli aggiornati su DB per ${updates.length} rilevazioni.`;
      this.loadRilevazioni();
    } catch (e: any) {
      this.error = 'Errore salvataggio calcoli: ' + e.message;
    } finally {
      this.uploading = false;
    }
  }

  // --- PAESI CONFIG ---

  async loadPaesiConfig() {
    this.loadingPaesi = true;
    try {
      this.paesiConfig = await this.dataService.getPaesiConfig();
      this.filterPaesi();
    } catch (e: any) {
      this.error = 'Errore caricamento paesi: ' + e.message;
    } finally {
      this.loadingPaesi = false;
      this.cd.detectChanges();
    }
  }

  filterPaesi() {
    const q = this.paesiSearch.toLowerCase();
    this.paesiConfigFiltered = q
      ? this.paesiConfig.filter(p => p.paese_en?.toLowerCase().includes(q) || p.paese_it?.toLowerCase().includes(q) || p.currency_code?.toLowerCase().includes(q))
      : [...this.paesiConfig];
  }

  async onSeedPaesi() {
    if (!confirm('Importare i 197 paesi da countries-data.json su Firestore?')) return;
    this.uploading = true;
    try {
      const data = await import('../countries-data.json');
      const entries: PaeseConfig[] = (data.default as any[]).map(e => ({
        paese_en: e.country_en, paese_it: e.country_it,
        currency: e.currency, currency_code: e.currency_code,
        exchange_rate: e.exchange_rate
      }));
      await this.dataService.seedPaesiConfig(entries);
      this.message = `${entries.length} paesi importati.`;
      this.loadPaesiConfig();
    } catch (e: any) { this.error = e.message; } finally { this.uploading = false; }
  }

  onEditPaese(p: PaeseConfig) { this.editingPaese = { ...p }; }
  cancelEditPaese() { this.editingPaese = null; }

  async savePaeseEdit() {
    if (!this.editingPaese) return;
    this.uploading = true;
    try {
      await this.dataService.savePaeseConfig(this.editingPaese);
      this.message = 'Paese aggiornato.';
      this.editingPaese = null;
      this.loadPaesiConfig();
    } catch (e: any) { this.error = e.message; } finally { this.uploading = false; }
  }

  async onAddPaese() {
    if (!this.newPaese.paese_en) return;
    this.uploading = true;
    try {
      await this.dataService.savePaeseConfig(this.newPaese);
      this.message = 'Paese aggiunto.';
      this.newPaese = this.emptyPaese();
      this.loadPaesiConfig();
    } catch (e: any) { this.error = e.message; } finally { this.uploading = false; }
  }

  async onDeletePaese(id: string) {
    if (!confirm('Eliminare questo paese?')) return;
    try {
      await this.dataService.deletePaeseConfig(id);
      this.loadPaesiConfig();
    } catch (e: any) { this.error = e.message; }
  }

  // --- AUTH ---

  async logout() { await signOut(this.auth); this.router.navigate(['/login']); }

  togglePasswordModal() { this.showPasswordModal = !this.showPasswordModal; this.newPassword = ''; this.error = ''; this.message = ''; }

  async onChangePassword() {
    if (!this.newPassword || this.newPassword.length < 6) { this.error = 'Minimo 6 caratteri.'; return; }
    const currentUser = this.auth.currentUser;
    if (!currentUser) return;
    this.uploading = true;
    try {
      await updatePassword(currentUser, this.newPassword);
      this.message = 'Password aggiornata!';
      setTimeout(() => this.togglePasswordModal(), 1500);
    } catch (e: any) {
      this.error = e.code === 'auth/requires-recent-login'
        ? 'Rifai il login prima di cambiare la password.'
        : e.message;
    } finally { this.uploading = false; }
  }
}
