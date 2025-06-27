
/**
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
}
