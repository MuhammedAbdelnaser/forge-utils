import { focusWithin } from "./focusWithin";
import { queryFocusable } from "./queryFocusable";

/**
 * Options for preventing focus from leaving a container
 */
export interface PreventFocusOutOptions {
  onFocus?: (container: Element) => void;
}

/**
 * Prevents focus from leaving a container (focus trap for modals, dropdowns)
 * @param container - The container to trap focus within
 * @param options - Configuration options
 * @returns Cleanup function to remove the focus trap
 * 
 * @example
 * const cleanup = preventFocusOut(modalElement);
 */
export function preventFocusOut(
  container: Element,
  options: PreventFocusOutOptions = {}
): () => void {
  const { onFocus = focusWithin } = options;
  
  if (!container?.contains) {
    console.warn('preventFocusOut: Invalid container provided');
    return () => {};
  }

  const isInside = (element: Element | null): boolean => 
    element ? container.contains(element) : false;
  
  const isFocusInside = (): boolean => isInside(document.activeElement);

  const ensureFocusedIn = (event?: Event): void => {
    if (isFocusInside()) return;
    
    onFocus(container);
    if (event) {
      event.preventDefault();
    }
  };

  const preventKeyLeaks = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    const { target, key, shiftKey } = keyboardEvent;
    
    if (key !== 'Tab') return;
    
    if (!isInside(target as Element)) {
      onFocus(container);
      keyboardEvent.preventDefault();
      return;
    }

    const focusables = queryFocusable(container);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const [edge, next] = shiftKey ? [first, last] : [last, first];

    if (edge === target) {
      next.focus();
      keyboardEvent.preventDefault();
    }
  };

  ensureFocusedIn();

  container.addEventListener('keydown', preventKeyLeaks);
  document.addEventListener('focusin', ensureFocusedIn);

  return () => {
    container.removeEventListener('keydown', preventKeyLeaks);
    document.removeEventListener('focusin', ensureFocusedIn);
  };
}
