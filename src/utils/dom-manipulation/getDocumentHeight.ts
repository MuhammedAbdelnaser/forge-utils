/**
 * Gets the full height of the document
 * @param doc - The document to measure (defaults to current document)
 * @returns The total document height in pixels
 * 
 * @example
 * const height = getDocumentHeight();
 * console.log(`Document is ${height}px tall`);
 */
export function getDocumentHeight(doc: Document = document): number {
  const body = doc.body;
  const html = doc.documentElement;

  if (!body || !html) {
    console.warn('getDocumentHeight: Invalid document structure');
    return 0;
  }

  return Math.max(
    body.scrollHeight,
    body.offsetHeight,
    html.clientHeight,
    html.scrollHeight,
    html.offsetHeight
  );
}
