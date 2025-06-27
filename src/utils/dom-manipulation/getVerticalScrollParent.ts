/**
 * Finds the nearest scrollable parent element
 * @param element - The element to start searching from
 * @returns The nearest scrollable parent element, window, or document
 * 
 * @example
 * const scrollParent = getVerticalScrollParent(myElement);
 * scrollParent.scrollTo({ top: 0, behavior: 'smooth' });
 */
export function getVerticalScrollParent(
  element: Element | Window | Document
): Element | Window | Document {
  if (element === window || element === document) {
    return element;
  }

  if (!(element instanceof Element)) {
    return window;
  }

  const computedStyle = window.getComputedStyle(element);
  const overflow = computedStyle.getPropertyValue('overflow');
  
  if (overflow === 'auto' || overflow === 'scroll') {
    return element;
  }
  
  const overflowY = computedStyle.getPropertyValue('overflow-y');
  if (overflowY === 'auto' || overflowY === 'scroll') {
    return element;
  }
  
  return getVerticalScrollParent(element.parentElement || document.body);
}
