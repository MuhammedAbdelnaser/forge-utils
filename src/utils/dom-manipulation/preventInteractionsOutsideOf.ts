import { preventContainerOverscroll } from "./preventContainerOverscroll";
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
}
