import { Component } from '@angular/core';
import { Routes } from '@angular/router';

@Component({ standalone: true, template: '' })
class SectionRouteComponent {}

export const routes: Routes = [
  { path: '', component: SectionRouteComponent },
  { path: 'inicio', component: SectionRouteComponent },
  { path: 'ao-vivo', component: SectionRouteComponent },
  { path: 'guilda', component: SectionRouteComponent },
  { path: 'eventos', component: SectionRouteComponent },
  { path: 'mural-de-missoes', redirectTo: 'eventos', pathMatch: 'full' },
  { path: 'o-que-ta-rolando', component: SectionRouteComponent },
  { path: 'arsenal', component: SectionRouteComponent },
  { path: 'arcenal', redirectTo: 'arsenal', pathMatch: 'full' },
  { path: 'rodape', component: SectionRouteComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' },
];
