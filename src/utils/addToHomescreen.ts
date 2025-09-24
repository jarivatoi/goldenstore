// Simple Add to Home Screen - Shows only once on first visit
export class AddToHomescreen {
  private options: any;

  constructor(options: any = {}) {
    this.options = {
      appName: 'Golden Store',
      appIconUrl: 'https://jarivatoi.github.io/goldenpricelist/icon-192.png',
      ...options
    };
  }

  show(): void {
    // Don't show if already running as installed PWA (works on iOS, Android, Desktop)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true ||
                         window.matchMedia('(display-mode: fullscreen)').matches ||
                         window.matchMedia('(display-mode: minimal-ui)').matches;
    
    if (isStandalone) {
      console.log('🚫 App is already installed as PWA, skipping prompt');
      return;
    }
    
    // Check if already shown before
    const hasShownBefore = localStorage.getItem('addToHomescreen-shown');
    if (hasShownBefore) {
      console.log('🚫 Add to homescreen already shown before, skipping');
      return;
    }

    // Mark as shown
    localStorage.setItem('addToHomescreen-shown', 'true');
    console.log('✅ Showing add to homescreen prompt');

    this.showModal();
  }

  private showModal(): void {
    // Create modal
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      text-align: center;
    `;

    // App icon
    const icon = document.createElement('img');
    icon.src = this.options.appIconUrl;
    icon.style.cssText = `
      width: 64px;
      height: 64px;
      border-radius: 12px;
      margin-bottom: 16px;
    `;
    icon.onerror = () => icon.style.display = 'none';

    // Title
    const title = document.createElement('h3');
    title.textContent = `Install ${this.options.appName}`;
    title.style.cssText = `
      margin: 0 0 12px 0;
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
    `;

    // Message
    const message = document.createElement('p');
    message.textContent = `Add ${this.options.appName} to your home screen for quick access!`;
    message.style.cssText = `
      margin: 0 0 24px 0;
      font-size: 16px;
      color: #666;
    `;

    // Instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      background: #f0f9ff;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      text-align: left;
    `;
    instructions.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px; color: #0369a1;">📱 How to install:</div>
      <div style="font-size: 14px; color: #0c4a6e; line-height: 1.5;">
        1. Tap the <strong>Share</strong> button <span style="font-size: 18px;">⬆️</span><br>
        2. Scroll down and tap <strong>"Add to Home Screen"</strong><br>
        3. Tap <strong>"Add"</strong> to confirm
      </div>
    `;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Maybe Later';
    closeBtn.style.cssText = `
      background: #f3f4f6;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 16px;
      color: #5f6368;
      cursor: pointer;
      width: 100%;
    `;

    closeBtn.onclick = () => document.body.removeChild(overlay);
    overlay.onclick = (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    };

    // Assemble modal
    modal.appendChild(icon);
    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(instructions);
    modal.appendChild(closeBtn);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Auto-close after 15 seconds
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }, 15000);
  }
}

export default AddToHomescreen;