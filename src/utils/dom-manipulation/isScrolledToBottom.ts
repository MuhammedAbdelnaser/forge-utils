/**
 * Checks if an element is scrolled to the bottom
 * @param element - The element to check
 * @param buffer - Optional buffer in pixels (default: 0)
 * @returns True if the element is scrolled to bottom within buffer tolerance
 * 
 * @example
 * const isAtBottom = isScrolledToBottom(chatContainer, 10);
 * if (isAtBottom) {
 *   console.log('User has scrolled to bottom');
 * }
 */
export function isScrolledToBottom(element: Element, buffer: number = 0): boolean {
  if (!(element instanceof Element)) {
    console.warn('isScrolledToBottom: Invalid element provided');
    return false;
  }

  const { scrollHeight, clientHeight, scrollTop } = element;
  const scrollBottom = clientHeight + scrollTop;
  const delta = Math.abs(scrollHeight - scrollBottom);
  
  return delta <= buffer;
}
