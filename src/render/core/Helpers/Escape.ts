function escapeHtmlAttr(str: string): string {
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

function unescapeHtml(str: string): string {
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
