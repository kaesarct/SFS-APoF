import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-link-submission',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './link-submission.html',
  styleUrl: './link-submission.css'
})
export class LinkSubmission {
  email = environment.email;
}
