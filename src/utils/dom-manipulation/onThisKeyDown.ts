/**
 * Adds a keydown event listener for a specific key
 * @param element - The element to attach the listener to
 * @param code - The key code to listen for (e.g., 'Enter', 'Escape')
 * @param handler - The function to call when the key is pressed
 * @returns Cleanup function to remove the listener
 * 
 * @example
 * const cleanup = onThisKeyDown(inputElement, 'Enter', () => {
 *   console.log('Enter key pressed');
 * });
 * // Later: cleanup();
 */
export function onThisKeyDown(
  element: Element,
  code: string,
  handler: () => void
): () => void {
  if (!element?.addEventListener) {
    console.warn('onThisKeyDown: Invalid element provided');
    return () => {};
  }

  const onKeyDown = (event: Event): void => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.code === code) {
      handler();
    }
  };

  element.addEventListener('keydown', onKeyDown);
  
  return () => {
    element.removeEventListener('keydown', onKeyDown);
  };
}
