import { getVerticalScrollParent } from "./getVerticalScrollParent";

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
}
