import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const MEASUREMENT_ID = 'G-1MWQ6QL89E';

type AnalyticsWindow = Window & {
  dataLayer?: unknown[][];
  gtag?: (...args: unknown[]) => void;
};

@Injectable({ providedIn: 'root' })
export class GoogleAnalyticsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private initialized = false;
  private lastTrackedPath = '';

  initialize(): void {
    if (this.initialized || !isPlatformBrowser(this.platformId)) return;
    this.initialized = true;

    const analyticsWindow = window as AnalyticsWindow;
    analyticsWindow.dataLayer ??= [];
    analyticsWindow.gtag ??= (...args: unknown[]) => analyticsWindow.dataLayer!.push(args);

    this.loadScript();
    analyticsWindow.gtag('js', new Date());
    analyticsWindow.gtag('config', MEASUREMENT_ID, { send_page_view: false });
    this.trackPageView();

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.trackPageView());
  }

  private loadScript(): void {
    if (this.document.querySelector(`script[data-ga4-id="${MEASUREMENT_ID}"]`)) return;

    const script = this.document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    script.dataset['ga4Id'] = MEASUREMENT_ID;
    this.document.head.appendChild(script);
  }

  private trackPageView(): void {
    const pagePath = `${window.location.pathname}${window.location.search}`;
    if (pagePath === this.lastTrackedPath) return;
    this.lastTrackedPath = pagePath;

    (window as AnalyticsWindow).gtag?.('event', 'page_view', {
      page_title: this.document.title,
      page_location: window.location.href,
      page_path: pagePath,
    });
  }
}
