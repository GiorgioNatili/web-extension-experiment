export function createElement(tag: string, className?: string, textContent?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (textContent) {
    element.textContent = textContent;
  }
  return element;
}

export function injectStyles(css: string): void {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

export function showNotification(message: string, type: 'success' | 'error' | 'warning' = 'warning'): void {
  const notification = createElement('div', `notification notification-${type}`);
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

export function createProgressBar(percentage: number): HTMLElement {
  const container = createElement('div', 'progress-container');
  const bar = createElement('div', 'progress-bar');
  const text = createElement('div', 'progress-text');
  
  bar.style.width = `${percentage}%`;
  text.textContent = `${Math.round(percentage)}%`;
  
  container.appendChild(bar);
  container.appendChild(text);
  
  return container;
}
