/**
 * Checks if an element is scrolled past the halfway point
 * @param element - The element to check
 * @returns True if scrolled past 50% of the scrollable height
 * 
 * @example
 * const isPastHalf = isScrolledPastHalfWay(articleElement);
 * if (isPastHalf) {
 *   showBackToTopButton();
 * }
 */
export function isScrolledPastHalfWay(element: Element): boolean {
  if (!(element instanceof Element)) {
    console.warn('isScrolledPastHalfWay: Invalid element provided');
    return false;
  }

  return element.scrollTop > (element.scrollHeight / 2);
}
