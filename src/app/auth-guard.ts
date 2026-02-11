import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { map, take, tap } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return user(auth).pipe(
    take(1),
    map(u => !!u),
    tap(loggedIn => {
      if (!loggedIn) {
        router.navigate(['/login']);
      }
    })
  );
};
