// ── Constants ─────────────────────────────────────────────────────────────────
const R     = 65;           // hex circumradius (px)
const SQRT3 = Math.sqrt(3);
const D2R   = Math.PI / 180;

// ── 19 tile centres (board centred at 0,0) ────────────────────────────────────
const TILE_CENTERS = (() => {
  const rowCounts = [3, 4, 5, 4, 3];
  const rowY      = [-R * 3, -R * 1.5, 0, R * 1.5, R * 3];
  const out = [];
  rowCounts.forEach((n, row) => {
    for (let col = 0; col < n; col++) {
      const x = (col - (n - 1) / 2) * R * SQRT3;
      out.push([x, rowY[row]]);
    }
  });
  return out;
})();

// ── Adjacency list (shared-edge neighbours for all 19 tiles) ─────────────────
const ADJACENCY = [
  [1, 3, 4],             // 0
  [0, 2, 4, 5],          // 1
  [1, 5, 6],             // 2
  [0, 4, 7, 8],          // 3
  [0, 1, 3, 5, 8, 9],    // 4
  [1, 2, 4, 6, 9, 10],   // 5
  [2, 5, 10, 11],        // 6
  [3, 8, 12],            // 7
  [3, 4, 7, 9, 12, 13],  // 8
  [4, 5, 8, 10, 13, 14], // 9
  [5, 6, 9, 11, 14, 15], // 10
  [6, 10, 15],           // 11
  [7, 8, 13, 16],        // 12
  [8, 9, 12, 14, 16, 17],// 13
  [9, 10, 13, 15, 17, 18],// 14
  [10, 11, 14, 18],      // 15
  [12, 13, 17],          // 16
  [13, 14, 16, 18],      // 17
  [14, 15, 17],          // 18
];

// ── Resource & number definitions ─────────────────────────────────────────────
const RESOURCES = [
  'grain', 'grain', 'grain', 'grain',
  'wool',  'wool',  'wool',  'wool',
  'wood',  'wood',  'wood',  'wood',
  'brick', 'brick', 'brick',
  'ore',   'ore',   'ore',
  'desert',
];

// Standard Catan number tokens (18 for 18 non-desert tiles)
const NUMBERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

const RESOURCE_COLOR = {
  grain:  '#E8B84B',
  wool:   '#5DBB63',
  wood:   '#2D6A4F',
  brick:  '#C1440E',
  ore:    '#7D8FA0',
  desert: '#DCC89A',
};

const RESOURCE_EMOJI = {
  grain:  '🌾',
  wool:   '🐑',
  wood:   '🌲',
  brick:  '🧱',
  ore:    '⛰️',
  desert: '🏜️',
};

// Number of probability dots (matching Catan tile dots)
const PROB_DOTS = { 2:1, 3:2, 4:3, 5:4, 6:5, 8:5, 9:4, 10:3, 11:2, 12:1 };

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tilesValid(tiles) {
  // No cluster of same-resource tiles larger than 2
  const visited = new Array(19).fill(false);
  for (let start = 0; start < 19; start++) {
    if (visited[start]) continue;
    const resource = tiles[start];
    const queue = [start];
    visited[start] = true;
    let size = 0;
    while (queue.length) {
      const curr = queue.shift();
      size++;
      if (size > 2) return false;
      for (const j of ADJACENCY[curr]) {
        if (!visited[j] && tiles[j] === resource) {
          visited[j] = true;
          queue.push(j);
        }
      }
    }
  }
  return true;
}

function numbersValid(numbers) {
  // No two adjacent tiles share a red number (6 or 8)
  const red = [6, 8];
  for (let i = 0; i < 19; i++) {
    if (red.includes(numbers[i])) {
      for (const j of ADJACENCY[i]) {
        if (red.includes(numbers[j])) return false;
      }
    }
  }
  return true;
}

// ── Board generation ──────────────────────────────────────────────────────────
function generateBoard() {
  // Step 1: shuffle resources until no two adjacent tiles share a type
  let tiles, attempts;
  attempts = 0;
  do {
    tiles = shuffle(RESOURCES);
    attempts++;
  } while (!tilesValid(tiles) && attempts < 1000);

  // Step 2: shuffle numbers until no two adjacent reds (6/8)
  const nonDesert = tiles.reduce((acc, t, i) => t !== 'desert' ? [...acc, i] : acc, []);
  let numbers;
  attempts = 0;
  do {
    const nums = shuffle(NUMBERS);
    numbers = new Array(19).fill(null);
    nonDesert.forEach((idx, i) => numbers[idx] = nums[i]);
    attempts++;
  } while (!numbersValid(numbers) && attempts < 500);

  return { tiles, numbers };
}

// ── SVG rendering ─────────────────────────────────────────────────────────────
function hexPoints(cx, cy) {
  return [30, 90, 150, 210, 270, 330]
    .map(deg => {
      const rad = deg * D2R;
      return `${(cx + R * Math.cos(rad)).toFixed(1)},${(cy + R * Math.sin(rad)).toFixed(1)}`;
    })
    .join(' ');
}

function svgEl(tag, attrs, text) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  if (text != null) el.textContent = text;
  return el;
}

function renderBoard({ tiles, numbers }) {
  const svg = document.getElementById('board-svg');
  svg.innerHTML = '';

  // Subtle outer shadow / border effect for the whole board
  const defs = svgEl('defs', {});
  defs.innerHTML = `
    <filter id="tile-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#00000055"/>
    </filter>`;
  svg.appendChild(defs);

  TILE_CENTERS.forEach(([cx, cy], i) => {
    const resource = tiles[i];
    const number   = numbers[i];
    const isRed    = number === 6 || number === 8;
    const dots     = PROB_DOTS[number] || 0;
    const tokenCY  = cy + R * 0.28;

    const g = svgEl('g', { filter: 'url(#tile-shadow)' });

    // Hex fill
    g.appendChild(svgEl('polygon', {
      points:         hexPoints(cx, cy),
      fill:           RESOURCE_COLOR[resource],
      stroke:         '#00000030',
      'stroke-width': '1.5',
    }));

    // Resource emoji — above centre if has number, centred if desert
    g.appendChild(svgEl('text', {
      x:                  cx,
      y:                  number ? cy - R * 0.14 : cy + R * 0.08,
      'text-anchor':      'middle',
      'dominant-baseline':'middle',
      'font-size':        R * 0.36,
    }, RESOURCE_EMOJI[resource]));

    if (number) {
      const tokenR = R * 0.29;

      // Token circle
      g.appendChild(svgEl('circle', {
        cx:           cx,
        cy:           tokenCY,
        r:            tokenR,
        fill:         '#fffff0',
        stroke:       isRed ? '#CC0000' : '#99999966',
        'stroke-width': isRed ? '1.5' : '1',
      }));

      // Number text
      g.appendChild(svgEl('text', {
        x:                  cx,
        y:                  tokenCY - R * 0.045,
        'text-anchor':      'middle',
        'dominant-baseline':'middle',
        'font-size':        R * 0.27,
        'font-weight':      'bold',
        fill:               isRed ? '#CC0000' : '#1a1a1a',
        'font-family':      'system-ui, sans-serif',
      }, number));

      // Probability dots
      if (dots > 0) {
        const dotR       = 2.2;
        const dotSpacing = 5.5;
        const dotY       = tokenCY + R * 0.115;
        const startX     = cx - ((dots - 1) * dotSpacing) / 2;

        for (let d = 0; d < dots; d++) {
          g.appendChild(svgEl('circle', {
            cx:   startX + d * dotSpacing,
            cy:   dotY,
            r:    dotR,
            fill: isRed ? '#CC0000' : '#44444499',
          }));
        }
      }
    }

    svg.appendChild(g);
  });
}

// ── Theme ─────────────────────────────────────────────────────────────────────
const themeBtnEl = document.getElementById('theme-btn');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeBtnEl.textContent = theme === 'light' ? '☀️' : '🌙';
  localStorage.setItem('theme', theme);
}

themeBtnEl.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'light' ? 'dark' : 'light');
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.getElementById('randomize-btn').addEventListener('click', () => {
  renderBoard(generateBoard());
});

applyTheme(localStorage.getItem('theme') || 'dark');
renderBoard(generateBoard());
