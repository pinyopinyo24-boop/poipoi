import { PDFParse } from 'pdf-parse';
import { createRequire } from 'node:module';
import path from 'node:path';

// Resolve resources from pdf-parse's own dependency tree (including pnpm's layout).
// Without these local CMaps, PDF.js can silently omit Japanese CID-font text.
const requireFromHere = createRequire(import.meta.url);
const requireFromParser = createRequire(requireFromHere.resolve('pdf-parse'));
const resources = path.dirname(requireFromParser.resolve('pdfjs-dist/package.json'));
export function createPDFParser(data: Uint8Array) {
  return new PDFParse({
    data,
    cMapUrl: path.join(resources, 'cmaps') + path.sep,
    cMapPacked: true,
    standardFontDataUrl: path.join(resources, 'standard_fonts') + path.sep,
  });
}
