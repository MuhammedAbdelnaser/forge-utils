/**
 * Checks if the remaining scroll area is shorter than the element's height
 * @param element - The element to check
 * @returns True if remaining scroll area is shorter than element height
 * 
 * @example
 * const isNearEnd = remainingScrollAreaShorterThanHeight(scrollContainer);
 * if (isNearEnd) {
 *   loadMoreContent();
 * }
 */
export function remainingScrollAreaShorterThanHeight(element: Element): boolean {
  if (!(element instanceof Element)) {
    console.warn('remainingScrollAreaShorterThanHeight: Invalid element provided');
    return false;
  }

  return (
    element.scrollHeight -
    element.clientHeight -
    element.scrollTop <
    element.clientHeight
  );
}
