import { isElementScrollable } from "./isElementScrollable";
import { preventOverscroll } from "./preventOverscroll";

/**
 * Prevents overscroll behavior on a container element
 * @param container - The container element
 * @returns Cleanup function to remove listeners
 * 
 * @example
 * const cleanup = preventOverscroll(modalContainer);
 * // When modal closes: cleanup();
 */
export function preventContainerOverscroll(container: Element): () => void {
  if (!container?.addEventListener) {
    console.warn('preventContainerOverscroll: Invalid container provided');
    return () => {};
  }

  const onContainerWheel = (event: Event): void => {
    const wheelEvent = event as WheelEvent;
    const target = wheelEvent.target as HTMLElement;
    
    if (target !== container && 
        container.contains(target) && 
        isElementScrollable(target)) {
      return preventOverscroll(wheelEvent);
    }
    
    if (container instanceof HTMLElement) {
      container.scrollTop = 0;
    }
    wheelEvent.preventDefault();
  };

  const BLOCKED_KEYS = ['PageUp', 'PageDown', 'End', 'Home', 'ArrowDown', 'ArrowUp'];
  
  const onContainerKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    const target = keyboardEvent.target as HTMLElement;
    
    if (target.tagName === 'TEXTAREA') {
      return;
    }
    
    if (BLOCKED_KEYS.includes(keyboardEvent.key)) {
      if (container.contains(target)) {
        keyboardEvent.stopPropagation();
      } else {
        keyboardEvent.preventDefault();
      }
    }
  };

  container.addEventListener('wheel', onContainerWheel, { passive: false });
  container.addEventListener('keydown', onContainerKeyDown, { passive: false });

  return () => {
    container.removeEventListener('wheel', onContainerWheel);
    container.removeEventListener('keydown', onContainerKeyDown);
  };
}

