declare module 'opentype.js' {
  interface NameRecord {
    [languageTag: string]: string
  }

  interface FontNames {
    fontFamily: NameRecord
    fontSubfamily: NameRecord
    designer?: NameRecord
    designerURL?: NameRecord
    manufacturer?: NameRecord
    version?: NameRecord
    license?: NameRecord
    description?: NameRecord
    copyright?: NameRecord
    [key: string]: NameRecord | undefined
  }

  interface Path {
    commands: Array<{ type: string; x?: number; y?: number }>
    toSVG(decimalPlaces?: number): string
    draw(ctx: CanvasRenderingContext2D): void
  }

  interface Glyph {
    index: number
    name: string | null
    unicode: number | undefined
    unicodes: number[]
    advanceWidth: number
    path: Path
    getPath(x: number, y: number, fontSize: number): Path
    draw(ctx: CanvasRenderingContext2D, x: number, y: number, fontSize: number): void
  }

  interface GlyphSet {
    length: number
    get(index: number): Glyph
  }

  interface Font {
    names: FontNames
    unitsPerEm: number
    ascender: number
    descender: number
    numGlyphs: number
    glyphs: GlyphSet
    charToGlyph(char: string): Glyph
    stringToGlyphs(str: string): Glyph[]
    getPath(text: string, x: number, y: number, fontSize: number): Path
    draw(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number): void
    tables: Record<string, unknown>
  }

  export function parse(buffer: ArrayBuffer): Font
  export function load(url: string, callback: (err: Error | null, font?: Font) => void): void
}
