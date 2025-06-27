
/**
 * CSS selectors for focusable elements
 */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '*[tabindex]:not([tabindex="-1"])',
  '*[contenteditable="true"]'
].join(',');


/**
 * Finds all focusable elements within a container
 * @param element - The container element to search within
 * @returns Array of focusable HTML elements
 * 
 * @example
 * const focusableElements = queryFocusable(modalElement);
 * console.log(`Found ${focusableElements.length} focusable elements`);
 */
export function queryFocusable(element: Element): HTMLElement[] {
  if (!element?.querySelectorAll) {
    console.warn('queryFocusable: Invalid element provided');
    return [];
  }

  const nodeList = element.querySelectorAll(FOCUSABLE_SELECTORS);
  
  return Array.from(nodeList).filter((node): node is HTMLElement => {
    if (!(node instanceof HTMLElement)) return false;
    
    const style = window.getComputedStyle(node);
    return (
      !node.hasAttribute('disabled') &&
      (node as HTMLInputElement).type !== 'hidden' &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      node.tabIndex >= 0
    );
  });
}
