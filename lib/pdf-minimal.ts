// Minimal PDF generator — builds a multi-page A4 PDF from JPEG byte arrays.
// Zero external dependencies: pure TypeScript using only built-in browser APIs.

export function buildPDFFromJpegs(
  jpegs: Uint8Array[],
  pageWidthPt = 595.28,
  pageHeightPt = 841.89,
): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let byteOffset = 0;
  const offsets: number[] = [];

  const write = (str: string) => {
    const bytes = enc.encode(str);
    chunks.push(bytes);
    byteOffset += bytes.length;
  };
  const writeBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    byteOffset += bytes.length;
  };

  const n = jpegs.length;
  const W = pageWidthPt.toFixed(2);
  const H = pageHeightPt.toFixed(2);

  // Object layout:
  //  1         → Catalog
  //  2         → Pages
  //  3…n+2     → Page objects
  //  n+3…2n+2  → Image XObjects
  //  2n+3…3n+2 → Content streams

  write('%PDF-1.4\n');

  offsets[1] = byteOffset;
  write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets[2] = byteOffset;
  write(`2 0 obj\n<< /Type /Pages /Kids [${Array.from({ length: n }, (_, i) => `${i + 3} 0 R`).join(' ')}] /Count ${n} >>\nendobj\n`);

  for (let i = 0; i < n; i++) {
    offsets[3 + i] = byteOffset;
    write(`${3 + i} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${n + 3 + i} 0 R >> >> /Contents ${2 * n + 3 + i} 0 R >>\nendobj\n`);
  }

  for (let i = 0; i < n; i++) {
    offsets[n + 3 + i] = byteOffset;
    const jpeg = jpegs[i];
    const { w: iw, h: ih } = readJpegDims(jpeg);
    write(`${n + 3 + i} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    writeBytes(jpeg);
    write('\nendstream\nendobj\n');
  }

  for (let i = 0; i < n; i++) {
    offsets[2 * n + 3 + i] = byteOffset;
    const stream = `q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q\n`;
    write(`${2 * n + 3 + i} 0 obj\n<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream\nendobj\n`);
  }

  const xrefPos = byteOffset;
  const totalObjs = 3 * n + 2;
  write(`xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= totalObjs; i++) {
    write(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  write(`trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

function readJpegDims(jpeg: Uint8Array): { w: number; h: number } {
  for (let i = 2; i < jpeg.length - 8; i++) {
    if (jpeg[i] === 0xff && (jpeg[i + 1] === 0xc0 || jpeg[i + 1] === 0xc2)) {
      return { h: (jpeg[i + 5] << 8) | jpeg[i + 6], w: (jpeg[i + 7] << 8) | jpeg[i + 8] };
    }
  }
  return { w: 1588, h: 2246 };
}
