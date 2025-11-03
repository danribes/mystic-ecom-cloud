export type ToastType = 'success' | 'error' | 'info';

class Toast {
  private container: HTMLDivElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.createContainer();
    }
  }

  private createContainer() {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    `;
    document.body.appendChild(this.container);
  }

  private createToastElement(message: string, type: ToastType): HTMLDivElement {
    const toast = document.createElement('div');
    
    const bgColor = type === 'success' ? 'bg-green-500' : 
                    type === 'error' ? 'bg-red-500' : 
                    'bg-blue-500';
    
    toast.className = `${bgColor} text-white px-4 py-2 rounded shadow-lg flex items-center justify-between min-w-[200px]`;
    
    const icon = type === 'success' ? '✓' : 
                 type === 'error' ? '✗' : 
                 'ℹ';
    
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <span>${icon}</span>
        <span>${message}</span>
      </div>
    `;

    return toast;
  }

  private showToast(element: HTMLDivElement) {
    if (!this.container) {
      this.createContainer();
    }
    
    this.container?.appendChild(element);
    
    // Animate in
    element.style.opacity = '0';
    element.style.transform = 'translateX(100%)';
    
    // Force reflow
    void element.offsetWidth;
    
    element.style.transition = 'all 0.3s ease-in-out';
    element.style.opacity = '1';
    element.style.transform = 'translateX(0)';
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (element.parentNode === this.container) {
        element.style.opacity = '0';
        element.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
          if (element.parentNode === this.container) {
            this.container?.removeChild(element);
          }
        }, 300);
      }
    }, 3000);
  }

  success(message: string) {
    const toast = this.createToastElement(message, 'success');
    this.showToast(toast);
  }

  error(message: string) {
    const toast = this.createToastElement(message, 'error');
    this.showToast(toast);
  }

  info(message: string) {
    const toast = this.createToastElement(message, 'info');
    this.showToast(toast);
  }
}

let instance: Toast | null = null;

export function useToast() {
  if (!instance) {
    instance = new Toast();
  }
  return instance;
}