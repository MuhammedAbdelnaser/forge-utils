import { queryFocusable } from "./queryFocusable";

/**
 * Options for the focusWithin function
 */
interface FocusWithinOptions {
  focusFirst?: HTMLElement;
}

/**
 * Focuses the first available element within a container
 * @param element - The container element
 * @param options - Configuration options
 * 
 * @example
 * focusWithin(modalElement); // Focus first focusable element
 * focusWithin(modalElement, { focusFirst: specificButton }); // Focus specific element if available
 */
export function focusWithin(element: Element, options: FocusWithinOptions = {}): void {
  if (!element?.contains) {
    console.warn('focusWithin: Invalid element provided');
    return;
  }

  const activeElement = document.activeElement;
  if (activeElement && element.contains(activeElement)) {
    return;
  }

  const { focusFirst } = options;
  const elements = queryFocusable(element);
  
  if (elements.length === 0) {
    return;
  }

  const elementToFocus = (focusFirst && elements.includes(focusFirst))
    ? focusFirst 
    : elements[0];
    
  elementToFocus?.focus();
}
