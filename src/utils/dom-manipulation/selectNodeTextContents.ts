/**
 * Selects all text content within a node
 * @param node - The node whose text content should be selected
 * 
 * @example
 * selectNodeTextContents(codeBlock); // Selects all code for easy copying
 */
export function selectNodeTextContents(node: Node): void {
  if (!node) {
    console.warn('selectNodeTextContents: No node provided');
    return;
  }

  try {
    if (window.getSelection) {
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(node);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } else {
      console.warn('selectNodeTextContents: Text selection not supported in this browser');
    }
  } catch (error) {
    console.error('selectNodeTextContents: Failed to select text', error);
  }
}
