
/**
 * Checks if an element has room for more content (not scrollable)
 * @param element - The element to check
 * @returns True if the element's content fits within its height
 * 
 * @example
 * const hasRoom = hasRoomForMore(contentDiv);
 * if (hasRoom) {
 *   console.log('Can add more content without scrolling');
 * }
 */
export function hasRoomForMore(element: Element): boolean {
  if (!(element instanceof Element)) {
    console.warn('hasRoomForMore: Invalid element provided');
    return false;
  }

  return element.scrollHeight <= element.clientHeight;
}
