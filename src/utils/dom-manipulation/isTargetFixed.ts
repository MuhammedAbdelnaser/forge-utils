/**
 * Checks if an element has fixed or sticky positioning
 * @param target - The element to check
 * @returns True if the element is fixed or actively sticky
 * 
 * @example
 * const isFixed = isTargetFixed(headerElement);
 * if (isFixed) {
 *   console.log('Element is fixed in viewport');
 * }
 */
export function isTargetFixed(target: Element): boolean {
  if (!target || target === document.body || target === document.documentElement) {
    return false;
  }

  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const computedStyle = window.getComputedStyle(target);
  const { position, top } = computedStyle;

  if (position === 'fixed') {
    return true;
  }

  if (position === 'sticky') {
    const stickyTop = parseInt(top, 10) || 0;
    const rect = target.getBoundingClientRect();
    return rect.top <= stickyTop;
  }

  if (target.parentElement) {
    return isTargetFixed(target.parentElement);
  }

  return false;
}
