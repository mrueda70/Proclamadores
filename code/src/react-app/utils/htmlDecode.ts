export function decodeHTMLEntities(text: string | null): string | null {
  if (!text) return null;
  
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}
