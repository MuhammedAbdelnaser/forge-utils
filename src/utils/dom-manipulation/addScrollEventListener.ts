/**
 * Adds a scroll event listener with proper document handling
 * @param element - The element to attach the listener to
 * @param onScroll - The scroll event handler
 * @returns Cleanup function to remove the listener
 * 
 * @example
 * const cleanup = addScrollEventListener(container, (e) => {
 *   console.log('Scroll position:', e.target.scrollTop);
 * });
 * // Later: cleanup();
 */
export function addScrollEventListener(
  element: Element | Window | Document,
  onScroll: (event: Event) => void
): () => void {
  const target = getEventTarget(element);
  target.addEventListener('scroll', onScroll, { passive: true });
  
  return () => {
    target.removeEventListener('scroll', onScroll);
  };
}
