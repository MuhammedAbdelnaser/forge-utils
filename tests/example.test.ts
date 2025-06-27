import { dataURItoFile } from '../src/utils/file-handling/dataURItoFile';

describe('dataURItoFile', () => {
  it('should convert data URI to File object', () => {
    const dataURI = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
    const filename = 'test.txt';
    
    const file = dataURItoFile(dataURI, filename);
    
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe(filename);
    expect(file.type).toBe('text/plain');
  });

  it('should handle invalid data URI', () => {
    expect(() => {
      dataURItoFile('invalid-data-uri', 'test.txt');
    }).toThrow();
  });
});
