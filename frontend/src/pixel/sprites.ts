/**
 * Pixel-art sprites drawn as character grids.
 *
 * Each row is a string; every character is one pixel and maps to a colour in the
 * sprite's palette. `.` is transparent. Keeping the art as text makes it reviewable
 * in a diff and lets the palette follow the product's CSS variables.
 */
export interface Sprite {
  rows: readonly string[]
  palette: Readonly<Record<string, string>>
}

export interface PixelRun {
  x: number
  y: number
  width: number
  key: string
}

/** Merge horizontal runs of the same colour so a sprite renders as few rects as possible. */
export function spriteRuns(rows: readonly string[]): PixelRun[] {
  const runs: PixelRun[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const key = row[x]
      if (key === '.' || key === ' ') { x += 1; continue }
      let end = x + 1
      while (end < row.length && row[end] === key) end += 1
      runs.push({ x, y, width: end - x, key })
      x = end
    }
  })
  return runs
}

export function spriteSize(sprite: Sprite) {
  return { width: Math.max(0, ...sprite.rows.map((row) => row.length)), height: sprite.rows.length }
}

const owlPalette = {
  o: 'var(--px-ink)',
  b: 'var(--px-owl)',
  d: 'var(--px-owl-dark)',
  c: 'var(--px-cream)',
  v: 'var(--px-owl)',
  w: '#fffdf4',
  k: 'var(--px-ink)',
  y: 'var(--px-mustard)',
  l: 'var(--px-owl-light)',
  r: 'var(--px-red)',
}

/** 咕咕, the librarian owl. 16 × 16. Rows 4–8 are the eyes and are swapped per mood. */
export const owl: Sprite = {
  palette: owlPalette,
  rows: [
    '..oo........oo..',
    '.obbo......obbo.',
    '.obbboooooobbbo.',
    '.obbbbbbbbbbbbo.',
    'obbwwwbbbbwwwbbo',
    'obwwwwwbbwwwwwbo',
    'obwwkkwbbwkkwwbo',
    'obwwkkwyywkkwwbo',
    'obbwwwbyybwwwbbo',
    'obbbbbbbbbbbbbbo',
    'odbbcccccccccbdo',
    'oddbccvcccvccbdo',
    'oddbcccccccccbdo',
    '.odbccvcccvccdo.',
    '..obbbbbbbbbbo..',
    '...oyyo..oyyo...',
  ],
}

export type OwlEyes = 'open' | 'closed' | 'happy' | 'dizzy' | 'left' | 'right' | 'down' | 'covered'

/** Replacement rows for the eye band (y = 4). */
export const owlEyes: Record<OwlEyes, Sprite> = {
  open: { palette: owlPalette, rows: owl.rows.slice(4, 9) },
  closed: {
    palette: owlPalette,
    rows: [
      'obblllbbbblllbbo',
      'oblllllbblllllbo',
      'obkkkkkbbkkkkkbo',
      'oblllllyylllllbo',
      'obblllbyyblllbbo',
    ],
  },
  happy: {
    palette: owlPalette,
    rows: [
      'obbwwwbbbbwwwbbo',
      'obwwkwwbbwwkwwbo',
      'obwkwkwbbwkwkwbo',
      'obwwwwwyywwwwwbo',
      'obbwwwbyybwwwbbo',
    ],
  },
  dizzy: {
    palette: owlPalette,
    rows: [
      'obbwwwbbbbwwwbbo',
      'obwkwkwbbwkwkwbo',
      'obwwkwwbbwwkwwbo',
      'obwkwkwyywkwkwbo',
      'obbwwwbyybwwwbbo',
    ],
  },
  left: {
    palette: owlPalette,
    rows: [
      'obbwwwbbbbwwwbbo',
      'obwwwwwbbwwwwwbo',
      'obkkwwwbbkkwwwbo',
      'obkkwwwyykkwwwbo',
      'obbwwwbyybwwwbbo',
    ],
  },
  right: {
    palette: owlPalette,
    rows: [
      'obbwwwbbbbwwwbbo',
      'obwwwwwbbwwwwwbo',
      'obwwwkkbbwwwkkbo',
      'obwwwkkyywwwkkbo',
      'obbwwwbyybwwwbbo',
    ],
  },
  down: {
    palette: owlPalette,
    rows: [
      'obbwwwbbbbwwwbbo',
      'obwwwwwbbwwwwwbo',
      'obwwwwwbbwwwwwbo',
      'obwwkkwyywkkwwbo',
      'obbwkkbyybkkwbbo',
    ],
  },
  covered: {
    palette: owlPalette,
    rows: [
      'obbdddbbbbdddbbo',
      'obdddddbbdddddbo',
      'oddodddbbdddoddo',
      'oddddodyydoddddo',
      'obdddddyydddddbo',
    ],
  },
}

export const magnifier: Sprite = {
  palette: { k: 'var(--px-ink)', g: '#e6f1ee', h: '#ffffff', y: 'var(--px-mustard)' },
  rows: [
    '.kkkk...',
    'kghggk..',
    'khgggk..',
    'kggggk..',
    'kggggk..',
    '.kkkky..',
    '.....yy.',
    '......yy',
  ],
}

export const sparkle: Sprite = {
  palette: { s: 'var(--px-mustard)', w: '#fff6cf' },
  rows: [
    '..s..',
    '..s..',
    'sswss',
    '..s..',
    '..s..',
  ],
}

export const bookmark: Sprite = {
  palette: { o: 'var(--px-ink)', r: 'var(--px-red)', l: '#d98068' },
  rows: [
    'ooooooo',
    'olrrrro',
    'olrrrro',
    'olrrrro',
    'olrrrro',
    'olrorro',
    'oro.oro',
    'oo...oo',
  ],
}

/** A closed book, used when a document flies into the library. */
export const miniBook: Sprite = {
  palette: { o: 'var(--px-ink)', r: 'var(--book-cover, var(--px-red))', l: 'var(--book-light, #d98068)', c: 'var(--px-cream)', y: 'var(--px-mustard)', p: '#fffdf4' },
  rows: [
    '.ooooooooo.',
    'olrrrrrrrpo',
    'olrcccccrpo',
    'olrcccccrpo',
    'olrrrrrrrpo',
    'olrrrrrrrpo',
    'olrrrrrrrpo',
    'olyyyyyyrpo',
    'olrrrrrrrpo',
    'olrrrrrrrpo',
    'olrrrrrrrpo',
    '.ooooooooo.',
  ],
}

const plantPalette = { o: 'var(--px-ink)', t: '#c07c56', T: '#d99a76', s: '#6b4a34', g: '#5f8a55', G: '#8fb37a', f: 'var(--px-red)', y: 'var(--px-mustard)' }
const pot = [
  '.oooooooooo.',
  '.oTTTTTTTTo.',
  '.otttttttto.',
  '..otttttto..',
  '..otttttto..',
  '...oooooo...',
]

/** A desk plant that grows with the number of conversations in the space. */
export const plantStages: readonly Sprite[] = [
  { palette: plantPalette, rows: ['............', '............', '............', '............', '............', '............', '............', '.....G......', '.....g......', ...pot] },
  { palette: plantPalette, rows: ['............', '............', '............', '............', '............', '...GG.......', '....gg.GG...', '.....ggg....', '.....g......', ...pot] },
  { palette: plantPalette, rows: ['............', '............', '.....GG.....', '..GG..g.....', '...gg.g..GG.', '....ggg.gg..', '.GG...ggg...', '..ggg.g.....', '....ggg.....', ...pot] },
  { palette: plantPalette, rows: ['....fff.....', '...fyyyf....', '....fff..GG.', '..GG..g.gg..', '...gg.ggg...', '....ggg.....', '.GG...g..GG.', '..ggg.g.gg..', '....ggggg...', ...pot] },
]

/** A slip of paper: the question on its way to the desk. */
export const note: Sprite = {
  palette: { o: 'var(--px-ink)', w: '#fffdf4', k: '#9aa58f' },
  rows: ['ooooooo', 'owwwwwo', 'owkkkwo', 'owwwwwo', 'owkkwwo', 'owwwwwo', 'ooooooo'],
}

const glyphPalette: Record<string, string> = { o: 'var(--px-ink)', a: '#7a9a84', b: 'var(--px-mustard)', x: 'var(--px-red)', y: 'var(--px-mustard)' }

/** Icons for the three ways to open a question. 12 × 10. */
export const glyphs = {
  consensus: {
    palette: glyphPalette,
    rows: [
      'ooooooo.....',
      'oaaaaao.....',
      'oaaaaao.....',
      'oaaoooooooo.',
      'oaaoxxxobbo.',
      'oaaoxxxobbo.',
      'ooooooooobo.',
      '...obbbbbbo.',
      '...obbbbbbo.',
      '...oooooooo.',
    ],
  },
  compare: {
    palette: glyphPalette,
    rows: [
      '.....yy.....',
      '.oooooooooo.',
      '.o...oo...o.',
      '.o...oo...o.',
      'ooo..oo..ooo',
      'oao..oo..oxo',
      'ooo..oo..ooo',
      '.....oo.....',
      '....oooo....',
      '..oooooooo..',
    ],
  },
  gap: {
    palette: glyphPalette,
    rows: [
      'oo.oo..oo.oo',
      'o..........o',
      '....xxxx....',
      'o..x....x..o',
      'o......x...o',
      '......x.....',
      'o.....x....o',
      'o..........o',
      '......x.....',
      'oo.oo..oo.oo',
    ],
  },
} satisfies Record<string, Sprite>

export const waterDrop: Sprite = {
  palette: { b: '#6fa6b3', w: '#d6ecef' },
  rows: ['.b.', 'bwb', 'bbb', '.b.'],
}
