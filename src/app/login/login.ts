import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';
  error = '';
  loading = false;

  private auth = inject(Auth);
  private router = inject(Router);

  async login() {
    this.loading = true;
    this.error = '';
    try {
      await signInWithEmailAndPassword(this.auth, this.email, this.password);
      this.router.navigate(['/admin']);
    } catch (e: any) {
      console.error(e);
      this.error = 'Accesso fallito. Controlla le tue credenziali.';
    } finally {
      this.loading = false;
    }
  }
}
