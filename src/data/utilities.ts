export const utilityContent: Record<string, string> = {
  "dataURItoFile": `/**
 * Converts a data URI to a File object
 * @param dataURI - The data URI string (e.g., "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...")
 * @param filename - The desired filename for the file
 * @returns File object that can be used with FormData or other APIs
 * 
 * @example
 * const file = dataURItoFile('data:text/plain;base64,SGVsbG8gV29ybGQ=', 'hello.txt');
 * console.log(file.name); // 'hello.txt'
 * console.log(file.type); // 'text/plain'
 */
export function dataURItoFile(dataURI: string, filename: string): File {
  const arr = dataURI.split(',');
  
  if (arr.length !== 2) {
    throw new Error('Invalid data URI format');
  }
  
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}`,

  "preventInteractionsOutsideOf": `import { preventContainerOverscroll } from "./preventContainerOverscroll";
import { preventFocusOut, PreventFocusOutOptions } from "./preventFocusOut";

/**
 * Options for preventing interactions outside a container
 */
interface PreventInteractionsOptions extends PreventFocusOutOptions {}

/**
 * Prevents all interactions outside of a specified container
 * @param container - The container to limit interactions to
 * @param options - Configuration options
 * @returns Cleanup function to remove all restrictions
 * 
 * @example
 * const cleanup = preventInteractionsOutsideOf(modalElement);
 * // When modal closes: cleanup();
 */
export function preventInteractionsOutsideOf(
  container: Element,
  options: PreventInteractionsOptions = {}
): () => void {
  const undoPreventFocusOut = preventFocusOut(container, options);
  const undoPreventOverscroll = preventContainerOverscroll(container);

  return () => {
    undoPreventFocusOut();
    undoPreventOverscroll();
  };
}`,

  "preventFocusOut": `import { focusWithin } from "./focusWithin";
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
}`,

  "isElementScrollable": `/**
 * Checks if an element has scrollable content
 * @param element - The element to check
 * @returns True if the element is scrollable
 * 
 * @example
 * const canScroll = isElementScrollable(contentDiv);
 * if (canScroll) {
 *   addScrollHandlers(contentDiv);
 * }
 */
export function isElementScrollable(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  return element.scrollHeight > element.clientHeight;
}`,

  "queryFocusable": `/**
 * CSS selectors for focusable elements
 */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '*[tabindex]:not([tabindex="-1"])',
  '*[contenteditable="true"]'
].join(',');

/**
 * Finds all focusable elements within a container
 * @param element - The container element to search within
 * @returns Array of focusable HTML elements
 * 
 * @example
 * const focusableElements = queryFocusable(modalElement);
 * console.log(\`Found \${focusableElements.length} focusable elements\`);
 */
export function queryFocusable(element: Element): HTMLElement[] {
  if (!element?.querySelectorAll) {
    console.warn('queryFocusable: Invalid element provided');
    return [];
  }

  const nodeList = element.querySelectorAll(FOCUSABLE_SELECTORS);
  
  return Array.from(nodeList).filter((node): node is HTMLElement => {
    if (!(node instanceof HTMLElement)) return false;
    
    const style = window.getComputedStyle(node);
    return (
      !node.hasAttribute('disabled') &&
      (node as HTMLInputElement).type !== 'hidden' &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      node.tabIndex >= 0
    );
  });
}`,

  "focusWithin": `import { queryFocusable } from "./queryFocusable";

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
}`,

  "getVerticalScrollParent": `/**
 * Finds the nearest scrollable parent element
 * @param element - The element to start searching from
 * @returns The nearest scrollable parent element, window, or document
 * 
 * @example
 * const scrollParent = getVerticalScrollParent(myElement);
 * scrollParent.scrollTo({ top: 0, behavior: 'smooth' });
 */
export function getVerticalScrollParent(
  element: Element | Window | Document
): Element | Window | Document {
  if (element === window || element === document) {
    return element;
  }

  if (!(element instanceof Element)) {
    return window;
  }

  const computedStyle = window.getComputedStyle(element);
  const overflow = computedStyle.getPropertyValue('overflow');
  
  if (overflow === 'auto' || overflow === 'scroll') {
    return element;
  }
  
  const overflowY = computedStyle.getPropertyValue('overflow-y');
  if (overflowY === 'auto' || overflowY === 'scroll') {
    return element;
  }
  
  return getVerticalScrollParent(element.parentElement || document.body);
}`,

  "scrollIntoView": `import { getVerticalScrollParent } from "./getVerticalScrollParent";

/**
 * Smoothly scrolls an element into view with optional offset
 * @param element - The element to scroll into view
 * @param offset - Optional offset from the top in pixels (default: 0)
 * 
 * @example
 * scrollIntoView(targetElement, 100); // Scroll with 100px offset from top
 */
export function scrollIntoView(element: Element, offset: number = 0): void {
  if (!(element instanceof Element)) {
    console.warn('scrollIntoView: Invalid element provided');
    return;
  }

  const offsetTop = (element as HTMLElement).offsetTop;
  const scrollParent = getVerticalScrollParent(element);
  
  if (scrollParent instanceof Element || scrollParent === window) {
    scrollParent.scrollTo({
      top: offsetTop - offset,
      behavior: 'smooth'
    });
  }
}`
};

export function getUtilityContent(name: string): string {
  return utilityContent[name] || `// Content for ${name} utility function`;
}