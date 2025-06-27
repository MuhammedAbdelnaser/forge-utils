
/**
 * Submits the parent form of an element
 * @param element - The element whose parent form should be submitted
 * 
 * @example
 * submitParentForm(submitButton); // Submits the form containing the button
 */
export function submitParentForm(element: HTMLElement): void {
  if (!(element instanceof HTMLElement)) {
    console.warn('submitParentForm: Invalid element provided');
    return;
  }

  const form = (element as HTMLInputElement).form || element.closest('form');
  
  if (!form) {
    console.warn('submitParentForm: No parent form found for element', element);
    return;
  }

  try {
    if (form.requestSubmit) {
      form.requestSubmit();
    } else {
      const submitButton = form.querySelector('input[type="submit"], button[type="submit"]') as HTMLElement;
      if (submitButton) {
        submitButton.click();
      } else {
        form.submit();
      }
    }
  } catch (error) {
    console.error('submitParentForm: Failed to submit form', error);
  }
}
