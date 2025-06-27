/**
 * Converts a data URI to a File object
 * @param dataURI - The data URI string (e.g., "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...")
 * @param filename - The desired filename for the file
 * @returns File object that can be used with FormData or other APIs
 * 
 * @example
 * const file = dataURItoFile('data:text/plain;base64,SGVsbG8gV29ybGQ=', 'hello.txt');
 * console.log(file.name); // 'hello.txt'
 * console.log(file.type); // 'text/plain'
 */
export function dataURItoFile(dataURI: string, filename: string): File {
  const arr = dataURI.split(',');
  
  if (arr.length !== 2) {
    throw new Error('Invalid data URI format');
  }
  
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}
