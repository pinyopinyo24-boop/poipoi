/** Local text PDF writer using the standard Japanese CID font/CMap. No browser,
 * subprocess, network request, or application restart is needed. */
export function createTextPDF(title: string, paragraphs: string[]): Buffer {
  const rows = [title, '', ...paragraphs.flatMap(text => text.split(/\r?\n/))]
    .flatMap(line => {
      const chars = Array.from(line); const wrapped: string[] = [];
      for (let start = 0; start < chars.length; start += 44) wrapped.push(chars.slice(start, start + 44).join(''));
      return wrapped.length ? wrapped : [''];
    });
  const pages: string[][] = [];
  for (let index = 0; index < rows.length; index += 45) pages.push(rows.slice(index, index + 45));
  const hex = (text: string) => {
    const buffer = Buffer.from(text, 'utf16le'); buffer.swap16(); return buffer.toString('hex').toUpperCase();
  };
  const codes = [...new Set(rows.join('').split('').map(character => hex(character)))];
  const mappings: string[] = [];
  for (let start = 0; start < codes.length; start += 100) {
    const batch = codes.slice(start, start + 100);
    mappings.push(batch.length + ' beginbfchar\n' + batch.map(code => '<' + code + '> <' + code + '>').join('\n') + '\nendbfchar');
  }
  const unicodeMap = '/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n' +
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n' +
    '/CMapName /AZUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n' +
    mappings.join('\n') + '\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend\n';
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>', '',
    '<< /Type /Font /Subtype /Type0 /BaseFont /HeiseiKakuGo-W5 /Encoding /UniJIS-UTF16-H /DescendantFonts [4 0 R] /ToUnicode 6 0 R >>',
    '<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HeiseiKakuGo-W5 /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 6 >> /DW 1000 /FontDescriptor 5 0 R >>',
    '<< /Type /FontDescriptor /FontName /HeiseiKakuGo-W5 /Flags 4 /FontBBox [-92 -250 1010 922] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>',
    '<< /Length ' + Buffer.byteLength(unicodeMap) + ' >>\nstream\n' + unicodeMap + 'endstream',
  ];
  const pageIds: number[] = [];
  for (const page of pages) {
    const pageId = objects.length + 1; const streamId = pageId + 1; pageIds.push(pageId);
    const stream = 'BT /F1 11 Tf 16 TL 48 792 Td\n' + page.map(line => '<' + hex(line) + '> Tj T*').join('\n') + '\nET\n';
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + streamId + ' 0 R >>',
      '<< /Length ' + Buffer.byteLength(stream) + ' >>\nstream\n' + stream + 'endstream');
  }
  objects[1] = '<< /Type /Pages /Count ' + pages.length + ' /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') + '] >>';
  let document = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((body, index) => { offsets.push(Buffer.byteLength(document)); document += (index + 1) + ' 0 obj\n' + body + '\nendobj\n'; });
  const xref = Buffer.byteLength(document);
  document += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n' + offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
  document += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(document);
}
