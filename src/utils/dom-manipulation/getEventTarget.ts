
/**
 * Helper function to get the correct event target
 * @param element - The element to process
 * @returns The correct event target
 */
function getEventTarget(element: Element | Window | Document): Element | Window | Document {
  if (element instanceof Element && 
      element.ownerDocument && 
      element === element.ownerDocument.documentElement) {
    return element.ownerDocument;
  }
  return element;
}
