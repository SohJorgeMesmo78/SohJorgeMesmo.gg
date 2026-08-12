import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

@Directive({ selector: '[appReveal]', standalone: true, host: { class: 'reveal-section' } })
export class RevealDirective {
  private readonly element = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => {
      const node = this.element.nativeElement;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
        node.classList.add('is-visible');
        return;
      }
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        node.classList.add('is-visible');
        observer.disconnect();
      }, { threshold: 0.12 });
      observer.observe(node);
    });
  }
}
