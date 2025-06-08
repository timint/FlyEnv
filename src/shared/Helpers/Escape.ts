export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, function (match: string): string {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[match]!;
  });
}

export function escapeHtmlAttr(str: string): string {
  return escapeHtml(str).replace(/\r|\n/, '\\$1');
}

export function unescapeHtml(str: string): string {
  return str.replace(/&(?:amp|lt|gt|quot|#39);/g, function (match: string): string {
    return ({
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'"
    })[match]!;
  });
}
