export function stripHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}


