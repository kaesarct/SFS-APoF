import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('renders the brand and the main navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('header p')?.textContent).toContain('Indice Nutella');
    const links = Array.from(compiled.querySelectorAll('header nav a')).map(a => a.getAttribute('href'));
    expect(links).toEqual(expect.arrayContaining(['/', '/methodology', '/ppp-index', '/instant-calculator', '/submit-link']));
  });
});
