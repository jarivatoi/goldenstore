/**
 * SCROLLING TEXT ANIMATOR
 * =======================
 * 
 * Enhanced TweenMax-style animation system for smooth text scrolling
 */

export interface ScrollingTextConfig {
  container: HTMLElement;
  textElement: HTMLElement;
  text: string;
  pauseDuration: number;
  scrollDuration: number;
  easing: string;
}

export class ScrollingTextAnimator {
  private container: HTMLElement;
  private textElement: HTMLElement;
  private text: string;
  private pauseDuration: number;
  private scrollDuration: number;
  private easing: string;
  private animationId: number | null = null;
  private isScrolling = false;
  private scrollTimeout: NodeJS.Timeout | null = null;
  private currentPosition = 0;
  private startTime = 0;
  private isAnimating = false;

  constructor(config: ScrollingTextConfig) {
    this.container = config.container;
    this.textElement = config.textElement;
    this.text = config.text;
    this.pauseDuration = config.pauseDuration * 1000; // Convert to ms
    this.scrollDuration = config.scrollDuration * 1000; // Convert to ms
    this.easing = config.easing;
    
    this.start();
  }

  static create(config: ScrollingTextConfig): ScrollingTextAnimator {
    return new ScrollingTextAnimator(config);
  }

  private start(): void {
    this.reset();
    this.scheduleNextAnimation();
  }

  private reset(): void {
    this.currentPosition = 0;
    this.textElement.style.transform = 'translateX(0px)';
    this.isAnimating = false;
  }

  private scheduleNextAnimation(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    this.scrollTimeout = setTimeout(() => {
      this.startScrollAnimation();
    }, this.pauseDuration);
  }

  private startScrollAnimation(): void {
    if (this.isScrolling) return;
    
    const containerWidth = this.container.offsetWidth;
    const textWidth = this.textElement.scrollWidth;
    const maxScroll = textWidth - containerWidth;
    
    if (maxScroll <= 0) return;
    
    this.isAnimating = true;
    this.startTime = performance.now();
    
    const animate = (currentTime: number) => {
      if (!this.isAnimating) return;
      
      const elapsed = currentTime - this.startTime;
      const progress = Math.min(elapsed / this.scrollDuration, 1);
      
      // Apply easing
      const easedProgress = this.applyEasing(progress);
      
      // Calculate position
      this.currentPosition = -maxScroll * easedProgress;
      this.textElement.style.transform = `translateX(${this.currentPosition}px)`;
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        // Schedule return animation
        setTimeout(() => {
          this.startReturnAnimation();
        }, this.pauseDuration);
      }
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  private startReturnAnimation(): void {
    if (this.isScrolling) return;
    
    this.isAnimating = true;
    this.startTime = performance.now();
    const startPosition = this.currentPosition;
    
    const animate = (currentTime: number) => {
      if (!this.isAnimating) return;
      
      const elapsed = currentTime - this.startTime;
      const progress = Math.min(elapsed / this.scrollDuration, 1);
      
      // Apply easing
      const easedProgress = this.applyEasing(progress);
      
      // Calculate position (return to 0)
      this.currentPosition = startPosition + (-startPosition * easedProgress);
      this.textElement.style.transform = `translateX(${this.currentPosition}px)`;
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.currentPosition = 0;
        // Schedule next cycle
        this.scheduleNextAnimation();
      }
    };
    
    this.animationId = requestAnimationFrame(animate);
  }

  private applyEasing(t: number): number {
    switch (this.easing) {
      case 'power1.inOut':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'power2.inOut':
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      case 'linear':
        return t;
      default:
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
  }

  public handleScrollStart(): void {
    this.isScrolling = true;
    this.stop();
    
    // Resume after scroll ends
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.scheduleNextAnimation();
    }, 1000); // Resume 1 second after scroll ends
  }

  public stop(): void {
    this.isAnimating = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
  }
}