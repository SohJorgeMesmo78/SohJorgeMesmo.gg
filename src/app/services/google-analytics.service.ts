import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const MEASUREMENT_ID = 'G-1MWQ6QL89E';

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
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
    this.debug('initialize: browser confirmed');

    const analyticsWindow = window as AnalyticsWindow;
    analyticsWindow.dataLayer ??= [];
    this.debug('dataLayer initialized', { length: analyticsWindow.dataLayer.length });

    analyticsWindow.gtag ??= function gtag() {
      analyticsWindow.dataLayer!.push(arguments);
    };
    this.debug('gtag function defined');

    this.loadScript();
    analyticsWindow.gtag('js', new Date());
    this.debug("gtag('js') queued");
    analyticsWindow.gtag('config', MEASUREMENT_ID, { send_page_view: false });
    this.debug("gtag('config') queued", { measurementId: MEASUREMENT_ID, sendPageView: false });
    this.trackPageView();

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.trackPageView());
  }

  private loadScript(): void {
    if (this.document.querySelector(`script[data-ga4-id="${MEASUREMENT_ID}"]`)) {
      this.debug('gtag script already present; duplicate insertion skipped');
      return;
    }

    const script = this.document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    script.dataset['ga4Id'] = MEASUREMENT_ID;
    script.addEventListener('load', () => this.debug('gtag script loaded'));
    script.addEventListener('error', () => this.debug('gtag script failed to load'));
    this.document.head.appendChild(script);
    this.debug('gtag script appended');
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
    this.debug("gtag('event', 'page_view') queued", { pagePath });
  }

  private debug(message: string, details?: Record<string, unknown>): void {
    console.info(`[GA4 Debug] ${message}`, details ?? '');
  }
}
