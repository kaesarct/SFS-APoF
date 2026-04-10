import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');

  cookieBannerVisible = !localStorage.getItem('cookie_consent');

  acceptCookies() {
    localStorage.setItem('cookie_consent', 'accepted');
    this.cookieBannerVisible = false;
  }

  declineCookies() {
    localStorage.setItem('cookie_consent', 'declined');
    this.cookieBannerVisible = false;
  }
}
