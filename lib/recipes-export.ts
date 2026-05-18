import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getPublicUrl } from '@/lib/storage';
import type { Recipe } from '@/types/app';

// ─── Helpers ────────────────────────────────────────────────────────────────

const esc = (s: string | number | null | undefined): string => {
  if (s == null || s === '') return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buf = await response.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

const difficultyLabel: Record<string, string> = {
  facil: 'Fácil',
  medio: 'Media',
  dificil: 'Difícil',
};

const difficultyColor: Record<string, string> = {
  facil: '#34C759',
  medio: '#FF9500',
  dificil: '#FF3B30',
};

const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23f2f2f7' rx='10'/%3E%3Ctext x='40' y='48' font-size='32' text-anchor='middle' fill='%23aeaeb2'%3E🍽%3C/text%3E%3C/svg%3E`;

// Crops a base64 image to the target aspect ratio (center crop) using the browser Canvas API.
function cropToAspect(base64: string, targetW: number, targetH: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const targetAspect = targetW / targetH;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (imgAspect > targetAspect) {
        sw = Math.round(img.naturalHeight * targetAspect);
        sx = Math.round((img.naturalWidth - sw) / 2);
      } else if (imgAspect < targetAspect) {
        sh = Math.round(img.naturalWidth / targetAspect);
        sy = Math.round((img.naturalHeight - sh) / 2);
      }
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

function currentMonthYear(): string {
  return new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
}

function totalTime(recipe: Recipe): string {
  const total = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0);
  if (total === 0) return '';
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ─── Flatten recipes (base + variaciones) in order ──────────────────────────

function flattenRecipes(recipes: Recipe[]): Array<{ recipe: Recipe; parentName: string | null }> {
  const result: Array<{ recipe: Recipe; parentName: string | null }> = [];
  for (const r of recipes) {
    result.push({ recipe: r, parentName: null });
    if (r.variations && r.variations.length > 0) {
      for (const v of r.variations) {
        result.push({ recipe: v, parentName: r.name });
      }
    }
  }
  return result;
}

// ─── Index page ─────────────────────────────────────────────────────────────

// Orden de secciones y prioridad cuando una receta tiene varias categorías
const CATEGORY_ORDER = [
  'Entrada',
  'Plato fuerte',
  'Acompañamiento',
  'Salsas y aderezos',
  'Postre',
];

function priorityCat(recipe: Recipe): string {
  if (recipe.categories.length === 0) return 'Sin categoría';
  for (const ordered of CATEGORY_ORDER) {
    if (recipe.categories.some((c) => c.name.toLowerCase() === ordered.toLowerCase())) {
      return ordered;
    }
  }
  return recipe.categories[0].name;
}

// Height budget constants (in CSS px = pt in print context at 72dpi/expo-print).
// A4 content area (297mm - 2×12mm margins) = 273mm ≈ 774pt.
// index-container padding: 40pt top + 44pt bottom = 84pt → 690pt inner.
// First page: minus title block (~70pt) → 620pt for entries.
const IDX_BUDGET_FIRST = 620;
const IDX_BUDGET_REST  = 690;
const IDX_CAT_H        = 42;   // category label (22px) + index-section margin-bottom (20px)
const IDX_ROW_H        = 23;   // one index row

type IndexChunk = { cat: string; items: Recipe[]; showCatHeader: boolean };

function buildIndexPages(recipes: Recipe[]): { html: string; numPages: number; recipeStartPage: number } {
  const groups = new Map<string, Recipe[]>();
  for (const r of recipes) {
    const cat = priorityCat(r);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(r);
  }
  const orderedKeys = [
    ...CATEGORY_ORDER.filter((c) => groups.has(c)),
    ...[...groups.keys()].filter((k) => !CATEGORY_ORDER.includes(k)),
  ];

  // ── Phase 1: layout chunks into pages ────────────────────────────────────
  const pages: IndexChunk[][] = [[]];
  let budget = IDX_BUDGET_FIRST;

  const pushChunk = (chunk: IndexChunk, h: number) => {
    pages[pages.length - 1].push(chunk);
    budget -= h;
  };
  const nextPage = () => { pages.push([]); budget = IDX_BUDGET_REST; };

  for (const cat of orderedKeys) {
    const catRecipes = groups.get(cat)!;
    const fullH = IDX_CAT_H + catRecipes.length * IDX_ROW_H;

    if (fullH <= budget) {
      pushChunk({ cat, items: catRecipes, showCatHeader: true }, fullH);
    } else if (fullH <= IDX_BUDGET_REST) {
      nextPage();
      pushChunk({ cat, items: catRecipes, showCatHeader: true }, fullH);
    } else {
      // Section too large for one page — split rows across pages
      let rowStart = 0;
      let isFirst = true;
      while (rowStart < catRecipes.length) {
        const headerH = isFirst ? IDX_CAT_H : 0;
        const rowsFit = Math.floor((budget - headerH) / IDX_ROW_H);
        if (rowsFit <= 0) { nextPage(); continue; }
        const slice = catRecipes.slice(rowStart, rowStart + rowsFit);
        pushChunk({ cat, items: slice, showCatHeader: isFirst }, headerH + slice.length * IDX_ROW_H);
        rowStart += slice.length;
        isFirst = false;
        if (rowStart < catRecipes.length) nextPage();
      }
    }
  }

  // ── Phase 2: assign recipe page numbers ───────────────────────────────────
  const recipeStart = 2 + pages.length;
  let rp = recipeStart;
  const pageNums = new Map<string, number>();
  for (const cat of orderedKeys) {
    for (const r of groups.get(cat)!) {
      pageNums.set(r.id, rp);
      rp += pagesForRecipe(r) + (r.variations?.reduce((sum, v) => sum + pagesForRecipe(v), 0) ?? 0);
    }
  }

  // ── Phase 3: render HTML ──────────────────────────────────────────────────
  const pageHtmls = pages.map((chunks, i) => {
    const pageNumber = 2 + i;
    const titleBlock = i === 0 ? `<div class="index-title">Índice</div>` : '';
    const sectionsHtml = chunks.map((chunk) => {
      const catLabel = chunk.showCatHeader ? `<div class="index-cat">${esc(chunk.cat)}</div>` : '';
      const rowsHtml = chunk.items.map((r) => `
        <div class="index-row">
          <span class="index-name">${esc(r.name)}</span>
          <span class="index-dots"></span>
          <span class="index-page">${pageNums.get(r.id)}</span>
        </div>`).join('');
      return `<div class="index-section">${catLabel}${rowsHtml}</div>`;
    }).join('');
    return `
    <div class="index-container">
      ${titleBlock}
      ${sectionsHtml}
      <div class="page-footer">${pageNumber}</div>
    </div>`;
  });

  return { html: pageHtmls.join('\n'), numPages: pages.length, recipeStartPage: recipeStart };
}

// ─── Ingredients HTML (direct + sauces with sub-ingredients) ────────────────

const DROP_SVG_INLINE = `<svg width="10" height="13" viewBox="0 0 10 13" style="vertical-align:middle;margin-right:5px;flex-shrink:0"><path d="M5 0C5 0 0 5.5 0 8.5A5 4.5 0 0 0 10 8.5C10 5.5 5 0 5 0Z" fill="#FF9500"/></svg>`;

function buildIngredientsHtml(recipe: Recipe): string {
  const direct = recipe.ingredients
    .sort((a, b) => a.order_index - b.order_index)
    .map((i) => `<div class="ingredient-item">${esc(i.quantity ?? '')} ${esc(i.unit)} ${esc(i.name)}</div>`)
    .join('');

  const sauces = recipe.sauces
    .map((sauce) => {
      const subItems = sauce.ingredients
        .map((i) => `<div class="sauce-ingredient-item">${esc(i.quantity ?? '')} ${esc(i.unit)} ${esc(i.name)}</div>`)
        .join('');
      const subSauces = (sauce.sauces ?? [])
        .map((ss) => `<div class="sauce-subsauce-item">${DROP_SVG_INLINE}${esc(ss.name)}</div>`)
        .join('');
      return `<div class="sauce-header">${DROP_SVG_INLINE}${esc(sauce.name)}</div>${subItems}${subSauces}`;
    })
    .join('');

  return direct + sauces;
}

// ─── Recipe page ─────────────────────────────────────────────────────────────

// Splits ingredients across two columns when the list is too tall for one page.
// When triggered, page 2 shows the overflow ingredients; steps stay on page 1.
function computeIngredientSplit(recipe: Recipe): { page1Html: string; page2Html: string } | null {
  const COL_BUDGET = 640;
  const sorted = recipe.ingredients.slice().sort((a, b) => a.order_index - b.order_index);
  const totalHeight = 30
    + sorted.length * 23
    + recipe.sauces.reduce((sum, s) => sum + 25 + s.ingredients.length * 23 + (s.sauces ?? []).length * 22, 0);

  if (totalHeight <= COL_BUDGET) return null;

  let height = 30;
  let page1DirectEnd = sorted.length;
  let page1SauceEnd = 0;
  let splitInDirect = false;

  for (let i = 0; i < sorted.length; i++) {
    if (height + 23 > COL_BUDGET) { page1DirectEnd = i; splitInDirect = true; break; }
    height += 23;
  }
  if (!splitInDirect) {
    for (let i = 0; i < recipe.sauces.length; i++) {
      const sauceH = 25 + recipe.sauces[i].ingredients.length * 23;
      if (height + sauceH > COL_BUDGET) break;
      height += sauceH;
      page1SauceEnd = i + 1;
    }
  }

  const toHtml = (ings: typeof sorted, sauces: typeof recipe.sauces) => {
    const direct = ings.map((i) => `<div class="ingredient-item">${esc(i.quantity ?? '')} ${esc(i.unit)} ${esc(i.name)}</div>`).join('');
    const saucesHtml = sauces.map((sauce) => {
      const subItems = sauce.ingredients.map((i) => `<div class="sauce-ingredient-item">${esc(i.quantity ?? '')} ${esc(i.unit)} ${esc(i.name)}</div>`).join('');
      const subSauces = (sauce.sauces ?? []).map((ss) => `<div class="sauce-subsauce-item">${DROP_SVG_INLINE}${esc(ss.name)}</div>`).join('');
      return `<div class="sauce-header">${DROP_SVG_INLINE}${esc(sauce.name)}</div>${subItems}${subSauces}`;
    }).join('');
    return direct + saucesHtml;
  };

  const page1Sauces = splitInDirect ? [] : recipe.sauces.slice(0, page1SauceEnd);
  const page2Sauces = splitInDirect ? recipe.sauces : recipe.sauces.slice(page1SauceEnd);

  return {
    page1Html: toHtml(sorted.slice(0, page1DirectEnd), page1Sauces),
    page2Html: toHtml(sorted.slice(page1DirectEnd), page2Sauces),
  };
}

// Splits steps when the step list alone is too tall for one page.
function splitSteps(recipe: Recipe): { page1Steps: Recipe['steps']; page2Steps: Recipe['steps'] } | null {
  const ingColHeight = 30
    + recipe.ingredients.length * 23
    + recipe.sauces.reduce((sum, s) => sum + 25 + s.ingredients.length * 23 + (s.sauces ?? []).length * 22, 0);
  const sorted = [...recipe.steps].sort((a, b) => a.order_index - b.order_index);
  const AVAILABLE_HEIGHT = Math.max(150, 650 - Math.max(0, ingColHeight - 220));
  let height = 0;
  for (let i = 0; i < sorted.length; i++) {
    const lines = Math.ceil(sorted[i].description.length / 55);
    const stepH = lines * 21 + 10;
    if (height + stepH > AVAILABLE_HEIGHT) {
      if (i === 0) return { page1Steps: [], page2Steps: sorted };
      return { page1Steps: sorted.slice(0, i), page2Steps: sorted.slice(i) };
    }
    height += stepH;
  }
  return null;
}

function pagesForRecipe(recipe: Recipe): number {
  return (computeIngredientSplit(recipe) !== null || splitSteps(recipe) !== null) ? 2 : 1;
}

function buildRecipePage(
  recipe: Recipe,
  parentName: string | null,
  photoSrc: string | null,
  pageNum: number
): string {
  const ingSplit = computeIngredientSplit(recipe);
  if (ingSplit) {
    return (
      buildRecipePageIngSplit1(recipe, parentName, photoSrc, pageNum, ingSplit.page1Html) +
      buildRecipePageIngSplit2(recipe, pageNum + 1, ingSplit.page2Html)
    );
  }
  const split = splitSteps(recipe);
  if (split) {
    return (
      buildRecipePagePart1(recipe, parentName, photoSrc, pageNum, split.page1Steps) +
      buildRecipePagePart2(recipe, pageNum + 1, split.page2Steps)
    );
  }
  return buildRecipePageSingle(recipe, parentName, photoSrc, pageNum);
}

// Page 1 when ingredients overflow: left col = partial ingredients, right col = ALL steps.
function buildRecipePageIngSplit1(
  recipe: Recipe,
  parentName: string | null,
  photoSrc: string | null,
  pageNum: number,
  page1IngrHtml: string
): string {
  const imgSrc = photoSrc ?? PLACEHOLDER_SVG;
  const time = totalTime(recipe);
  const diff = difficultyLabel[recipe.difficulty] ?? recipe.difficulty;
  const diffColor = difficultyColor[recipe.difficulty] ?? '#8e8e93';
  const cats = recipe.categories.map((c) => esc(c.name)).join(' · ');
  const methods = recipe.methods.map((m) => esc(m.name)).join(' · ');
  const variationTag = parentName ? `<div class="variation-tag">Variación de: ${esc(parentName)}</div>` : '';
  const descriptionBlock = recipe.description ? `<div class="recipe-description">"${esc(recipe.description)}"</div>` : '';
  const notesBlock = recipe.notes ? `<div class="notes-block"><span class="notes-label">Notas del chef</span> ${esc(recipe.notes)}</div>` : '';

  const allSteps = [...recipe.steps].sort((a, b) => a.order_index - b.order_index);
  const stepsHtml = allSteps.map((s, idx) => `
      <div class="step-row">
        <span class="step-num">${idx + 1}</span>
        <span class="step-text">${esc(s.description)}</span>
      </div>`).join('');

  return `
  <div class="recipe-page">
    ${variationTag}
    <div class="recipe-top">
      <img class="recipe-photo" src="${imgSrc}" alt="" />
      <div class="recipe-right">
        <div class="recipe-title-bar">
          <div class="title-accent"></div>
          <h1 class="recipe-title">${esc(recipe.name.toUpperCase())}</h1>
        </div>
        <div class="recipe-meta">
          ${time ? `<div class="meta-item"><span class="meta-label">Tiempo</span><span class="meta-value">${time}</span></div>` : ''}
          <div class="meta-item"><span class="meta-label">Porciones</span><span class="meta-value">${recipe.base_servings}</span></div>
          <div class="meta-item"><span class="meta-label">Dificultad</span><span class="meta-value" style="color:${diffColor}">${diff}</span></div>
          ${cats ? `<div class="meta-item"><span class="meta-label">Categoría</span><span class="meta-value">${cats}</span></div>` : ''}
          ${methods ? `<div class="meta-item"><span class="meta-label">Método</span><span class="meta-value">${methods}</span></div>` : ''}
        </div>
        ${descriptionBlock}
        ${notesBlock}
      </div>
    </div>
    <div class="section-divider"></div>
    <div class="recipe-bottom">
      <div class="recipe-col">
        <div class="section-label">Ingredientes</div>
        <div class="ingredients-list">${page1IngrHtml}</div>
        <div class="continuation-note">Continúa en la siguiente página →</div>
      </div>
      <div class="recipe-col">
        <div class="section-label">Pasos</div>
        <div class="steps-list">${stepsHtml}</div>
      </div>
    </div>
    <div class="page-footer">${pageNum}</div>
  </div>`;
}

// Page 2 when ingredients overflow: remaining ingredients (no steps, they're on page 1).
function buildRecipePageIngSplit2(recipe: Recipe, pageNum: number, page2IngrHtml: string): string {
  return `
  <div class="recipe-page">
    <div class="continuation-banner">
      <div class="title-accent"></div>
      <h1 class="recipe-title">${esc(recipe.name.toUpperCase())}</h1>
      <span class="continuation-label">continuación</span>
    </div>
    <div class="section-divider"></div>
    <div class="recipe-bottom-full">
      <div class="section-label">Ingredientes</div>
      <div class="ingredients-list">${page2IngrHtml}</div>
    </div>
    <div class="page-footer">${pageNum}</div>
  </div>`;
}

function buildRecipePageSingle(
  recipe: Recipe,
  parentName: string | null,
  photoSrc: string | null,
  pageNum: number
): string {
  const imgSrc = photoSrc ?? PLACEHOLDER_SVG;
  const time = totalTime(recipe);
  const diff = difficultyLabel[recipe.difficulty] ?? recipe.difficulty;
  const diffColor = difficultyColor[recipe.difficulty] ?? '#8e8e93';
  const cats = recipe.categories.map((c) => esc(c.name)).join(' · ');
  const methods = recipe.methods.map((m) => esc(m.name)).join(' · ');

  const variationTag = parentName
    ? `<div class="variation-tag">Variación de: ${esc(parentName)}</div>`
    : '';

  const descriptionBlock = recipe.description
    ? `<div class="recipe-description">"${esc(recipe.description)}"</div>`
    : '';

  const notesBlock = recipe.notes
    ? `<div class="notes-block"><span class="notes-label">Notas del chef</span> ${esc(recipe.notes)}</div>`
    : '';

  const ingredientsHtml = buildIngredientsHtml(recipe);

  const stepsHtml = recipe.steps
    .sort((a, b) => a.order_index - b.order_index)
    .map((s, idx) => `
      <div class="step-row">
        <span class="step-num">${idx + 1}</span>
        <span class="step-text">${esc(s.description)}</span>
      </div>`)
    .join('');

  return `
  <div class="recipe-page">
    ${variationTag}

    <div class="recipe-top">
      <img class="recipe-photo" src="${imgSrc}" alt="" />
      <div class="recipe-right">
        <div class="recipe-title-bar">
          <div class="title-accent"></div>
          <h1 class="recipe-title">${esc(recipe.name.toUpperCase())}</h1>
        </div>
        <div class="recipe-meta">
          ${time ? `<div class="meta-item"><span class="meta-label">Tiempo</span><span class="meta-value">${time}</span></div>` : ''}
          <div class="meta-item"><span class="meta-label">Porciones</span><span class="meta-value">${recipe.base_servings}</span></div>
          <div class="meta-item"><span class="meta-label">Dificultad</span><span class="meta-value" style="color:${diffColor}">${diff}</span></div>
          ${cats ? `<div class="meta-item"><span class="meta-label">Categoría</span><span class="meta-value">${cats}</span></div>` : ''}
          ${methods ? `<div class="meta-item"><span class="meta-label">Método</span><span class="meta-value">${methods}</span></div>` : ''}
        </div>
        ${descriptionBlock}
        ${notesBlock}
      </div>
    </div>

    <div class="section-divider"></div>

    <div class="recipe-bottom">
      <div class="recipe-col">
        <div class="section-label">Ingredientes</div>
        <div class="ingredients-list">${ingredientsHtml}</div>
      </div>
      <div class="recipe-col">
        <div class="section-label">Pasos</div>
        <div class="steps-list">${stepsHtml}</div>
      </div>
    </div>

    <div class="page-footer">${pageNum}</div>
  </div>`;
}

function buildRecipePagePart1(
  recipe: Recipe,
  parentName: string | null,
  photoSrc: string | null,
  pageNum: number,
  page1Steps: Recipe['steps']
): string {
  const imgSrc = photoSrc ?? PLACEHOLDER_SVG;
  const time = totalTime(recipe);
  const diff = difficultyLabel[recipe.difficulty] ?? recipe.difficulty;
  const diffColor = difficultyColor[recipe.difficulty] ?? '#8e8e93';
  const cats = recipe.categories.map((c) => esc(c.name)).join(' · ');
  const methods = recipe.methods.map((m) => esc(m.name)).join(' · ');

  const variationTag = parentName
    ? `<div class="variation-tag">Variación de: ${esc(parentName)}</div>`
    : '';

  const descriptionBlock = recipe.description
    ? `<div class="recipe-description">"${esc(recipe.description)}"</div>`
    : '';

  const notesBlock = recipe.notes
    ? `<div class="notes-block"><span class="notes-label">Notas del chef</span> ${esc(recipe.notes)}</div>`
    : '';

  const ingredientsHtml = buildIngredientsHtml(recipe);

  const stepsHtml = page1Steps
    .map((s, idx) => `
      <div class="step-row">
        <span class="step-num">${idx + 1}</span>
        <span class="step-text">${esc(s.description)}</span>
      </div>`)
    .join('');

  const stepsBlock = page1Steps.length > 0
    ? `<div class="section-label">Pasos</div><div class="steps-list">${stepsHtml}</div><div class="continuation-note">Continúa en la siguiente página →</div>`
    : `<div class="continuation-note">Ver pasos en la siguiente página →</div>`;

  return `
  <div class="recipe-page">
    ${variationTag}

    <div class="recipe-top">
      <img class="recipe-photo" src="${imgSrc}" alt="" />
      <div class="recipe-right">
        <div class="recipe-title-bar">
          <div class="title-accent"></div>
          <h1 class="recipe-title">${esc(recipe.name.toUpperCase())}</h1>
        </div>
        <div class="recipe-meta">
          ${time ? `<div class="meta-item"><span class="meta-label">Tiempo</span><span class="meta-value">${time}</span></div>` : ''}
          <div class="meta-item"><span class="meta-label">Porciones</span><span class="meta-value">${recipe.base_servings}</span></div>
          <div class="meta-item"><span class="meta-label">Dificultad</span><span class="meta-value" style="color:${diffColor}">${diff}</span></div>
          ${cats ? `<div class="meta-item"><span class="meta-label">Categoría</span><span class="meta-value">${cats}</span></div>` : ''}
          ${methods ? `<div class="meta-item"><span class="meta-label">Método</span><span class="meta-value">${methods}</span></div>` : ''}
        </div>
        ${descriptionBlock}
        ${notesBlock}
      </div>
    </div>

    <div class="section-divider"></div>

    ${page1Steps.length > 0
      ? `<div class="recipe-bottom">
           <div class="recipe-col">
             <div class="section-label">Ingredientes</div>
             <div class="ingredients-list">${ingredientsHtml}</div>
           </div>
           <div class="recipe-col">${stepsBlock}</div>
         </div>`
      : `<div class="recipe-bottom-full">
           <div class="section-label">Ingredientes</div>
           <div class="ingredients-list">${ingredientsHtml}</div>
           <div class="continuation-note">Ver pasos en la siguiente página →</div>
         </div>`
    }

    <div class="page-footer">${pageNum}</div>
  </div>`;
}

function buildRecipePagePart2(recipe: Recipe, pageNum: number, page2Steps: Recipe['steps']): string {
  const allSteps = recipe.steps.sort((a, b) => a.order_index - b.order_index);
  const startIdx = allSteps.length - page2Steps.length;

  const stepsHtml = page2Steps
    .map((s, idx) => `
      <div class="step-row">
        <span class="step-num">${startIdx + idx + 1}</span>
        <span class="step-text">${esc(s.description)}</span>
      </div>`)
    .join('');

  return `
  <div class="recipe-page">
    <div class="continuation-banner">
      <div class="title-accent"></div>
      <h1 class="recipe-title">${esc(recipe.name.toUpperCase())}</h1>
      <span class="continuation-label">continuación</span>
    </div>

    <div class="section-divider"></div>

    <div class="recipe-bottom-full">
      <div class="section-label">Pasos</div>
      <div class="steps-list">${stepsHtml}</div>
    </div>

    <div class="page-footer">${pageNum}</div>
  </div>`;
}

// ─── Full HTML ───────────────────────────────────────────────────────────────

function buildCookbookHTML(recipes: Recipe[], images: Record<string, string>, iconBase64: string | null, iconUri?: string): string {
  const sorted = [...recipes].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(priorityCat(a));
    const bi = CATEGORY_ORDER.indexOf(priorityCat(b));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  const flat = flattenRecipes(sorted);
  const totalRecipes = sorted.length;
  const month = currentMonthYear();

  const logoSrc = iconBase64 ?? iconUri ?? null;
  const logoHTML = logoSrc
    ? `<img class="cover-logo-img" src="${logoSrc}" alt="Logo" />`
    : `<div class="cover-logo">🍳</div>`;

  // Portada
  const coverHTML = `
  <div class="cover-page">
    <div class="cover-stripe-top"></div>
    <div class="cover-content">
      ${logoHTML}
      <div class="cover-app-name">QuéCocinarHoy</div>
      <div class="cover-divider"></div>
      <div class="cover-subtitle">Mis Recetas</div>
      <div class="cover-date">${month}</div>
      <div class="cover-count">${totalRecipes} ${totalRecipes === 1 ? 'receta' : 'recetas'}</div>
    </div>
    <div class="cover-stripe-bottom"></div>
  </div>`;

  // Índice (puede ocupar varias páginas)
  const { html: indexHTML, recipeStartPage } = buildIndexPages(sorted);

  // Páginas de recetas
  let pageNum = recipeStartPage;
  const recipePages = flat.map(({ recipe, parentName }) => {
    const page = buildRecipePage(recipe, parentName, images[recipe.id] ?? null, pageNum);

    pageNum += pagesForRecipe(recipe);
    return page;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Mis Recetas — QuéCocinarHoy</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .print-banner {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: #fff8f0;
      border-bottom: 2px solid #FF9500;
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      color: #1c1c1e;
    }
    .print-banner button {
      margin-left: auto;
      padding: 8px 18px;
      background: #FF9500;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    @media print { .print-banner { display: none !important; } }
    html, body {
      width: 100%;
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      color: #1c1c1e;
      background: #fff;
      font-size: 14px;
      line-height: 1.5;
    }

    /* ── Cover ── */
    .cover-page {
      width: 100%;
      min-height: 273mm;
      display: flex;
      flex-direction: column;
      page-break-after: always;
      background: #fff;
      border: 14px solid #FF9500;
      box-sizing: border-box;
    }
    .cover-stripe-top, .cover-stripe-bottom {
      height: 36px;
      background: #FF9500;
      flex-shrink: 0;
    }
    .cover-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px;
    }
    .cover-logo { font-size: 72px; line-height: 1; }
    .cover-logo-img { width: 88px; height: 88px; border-radius: 20px; }
    .cover-app-name { font-size: 36px; font-weight: 800; color: #1c1c1e; letter-spacing: -0.5px; }
    .cover-divider { width: 60px; height: 3px; background: #FF9500; border-radius: 2px; }
    .cover-subtitle { font-size: 22px; font-weight: 600; color: #3a3a3c; }
    .cover-date { font-size: 15px; color: #8e8e93; text-transform: capitalize; }
    .cover-count { font-size: 13px; color: #aeaeb2; margin-top: 8px; }

    /* ── Index ── */
    .index-container {
      width: 100%;
      min-height: 273mm;
      padding: 40px 44px 44px;
      page-break-after: always;
      border: 14px solid #FF9500;
      box-sizing: border-box;
      position: relative;
    }
    .index-title {
      font-size: 28px;
      font-weight: 800;
      color: #1c1c1e;
      margin-bottom: 28px;
      padding-bottom: 12px;
      border-bottom: 2px solid #FF9500;
    }
    .index-section { margin-bottom: 20px; }
    .index-cat {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #FF9500;
      margin-bottom: 6px;
    }
    .index-row {
      display: flex;
      align-items: baseline;
      gap: 4px;
      padding: 4px 0;
      border-bottom: 0.5px solid #f2f2f7;
    }
    .index-name { font-size: 14px; color: #1c1c1e; white-space: nowrap; }
    .index-dots { flex: 1; border-bottom: 1px dotted #c7c7cc; margin: 0 6px 3px; }
    .index-page { font-size: 13px; color: #8e8e93; white-space: nowrap; }

    /* ── Recipe page ── */
    .recipe-page {
      width: 100%;
      min-height: 273mm;
      padding: 24px 28px 20px;
      page-break-after: always;
      border: 14px solid #FF9500;
      box-sizing: border-box;
      position: relative;
    }
    .variation-tag {
      font-size: 10px;
      font-weight: 700;
      color: #FF9500;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 4px;
    }
    .recipe-title-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .title-accent {
      width: 5px;
      height: 32px;
      background: #FF9500;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .recipe-title {
      font-size: 24px;
      font-weight: 800;
      color: #1c1c1e;
      letter-spacing: -0.3px;
      line-height: 1.2;
    }
    /* ── Recipe layout ── */
    .recipe-top {
      display: flex;
      gap: 18px;
      height: 280px;
      margin-bottom: 16px;
    }
    .recipe-photo {
      width: 55%;
      height: 100%;
      object-fit: fill;
      border-radius: 8px;
      flex-shrink: 0;
      display: block;
    }
    .recipe-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow: hidden;
    }
    .recipe-meta {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .meta-item { display: flex; gap: 8px; align-items: baseline; }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      color: #aeaeb2;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      width: 68px;
      flex-shrink: 0;
    }
    .meta-value { font-size: 13px; color: #1c1c1e; font-weight: 500; }
    .recipe-bottom {
      display: flex;
      gap: 28px;
    }
    .recipe-col { flex: 1; }
    .recipe-description {
      font-size: 13px;
      color: #636366;
      font-style: italic;
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .notes-block {
      font-size: 12px;
      color: #636366;
      background: #fff8f0;
      border-left: 3px solid #FF9500;
      padding: 8px 12px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .notes-label {
      font-weight: 700;
      color: #FF9500;
      margin-right: 6px;
    }
    .section-divider {
      height: 2px;
      background: #FF9500;
      opacity: 0.25;
      margin: 14px 0 12px;
    }
    .section-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #FF9500;
      margin-bottom: 10px;
    }
    .ingredients-list {
      font-size: 13px;
      color: #3a3a3c;
      line-height: 1.8;
    }
    .ingredient-item {
      padding: 2px 0;
      border-bottom: 0.5px solid #f2f2f7;
    }
    .sauce-header {
      display: flex;
      align-items: center;
      padding: 5px 0 2px;
      font-size: 12px;
      font-weight: 700;
      color: #FF9500;
      border-bottom: 0.5px solid #f2f2f7;
      margin-top: 3px;
    }
    .sauce-ingredient-item {
      padding: 2px 0 2px 14px;
      border-bottom: 0.5px solid #f2f2f7;
      color: #636366;
    }
    .sauce-subsauce-item {
      display: flex;
      align-items: center;
      padding: 3px 0 3px 14px;
      border-bottom: 0.5px solid #f2f2f7;
      font-size: 11px;
      font-weight: 700;
      color: rgba(255,149,0,0.65);
    }
    .steps-list { display: flex; flex-direction: column; gap: 10px; }
    .step-row { display: flex; gap: 12px; align-items: flex-start; }
    .step-num {
      font-size: 13px;
      font-weight: 800;
      color: #FF9500;
      min-width: 20px;
      padding-top: 1px;
    }
    .step-text { font-size: 13px; color: #3a3a3c; line-height: 1.6; }

    /* ── Continuation page ── */
    .continuation-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
    }
    .continuation-label {
      font-size: 11px;
      font-weight: 700;
      color: #FF9500;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      background: #fff8f0;
      border: 1px solid #FF9500;
      border-radius: 4px;
      padding: 2px 8px;
      margin-left: 4px;
      flex-shrink: 0;
    }
    .continuation-note {
      font-size: 12px;
      color: #aeaeb2;
      font-style: italic;
      padding-top: 8px;
    }
    .recipe-bottom-full { padding-top: 4px; }
    .recipe-bottom-full .steps-list { display: flex; flex-direction: column; gap: 10px; }

    /* ── Page footer ── */
    .page-footer {
      position: absolute;
      bottom: 20px;
      right: 20px;
      font-size: 11px;
      color: #aeaeb2;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="print-banner">
    <span>📖 Mis Recetas — QuéCocinarHoy</span>
    <button onclick="window.print()">🖨&nbsp; Imprimir / Guardar PDF</button>
  </div>
  ${coverHTML}
  ${indexHTML}
  ${recipePages}
</body>
</html>`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type ExportProgressCallback = (
  phase: 'images' | 'pages' | 'done',
  completed: number,
  total: number,
) => void;

export async function exportRecipesAsPDF(
  recipes: Recipe[],
  iconUri?: string,
  onProgress?: ExportProgressCallback,
): Promise<void> {
  // Fetch all photos (base recipes + variations) + app icon
  const allRecipes = recipes.flatMap((r) => [r, ...(r.variations ?? [])]);
  const images: Record<string, string> = {};
  const imageTotal = allRecipes.length;
  onProgress?.('images', 0, imageTotal);
  let imagesCompleted = 0;
  await Promise.all(
    allRecipes.map(async (recipe) => {
      const url = getPublicUrl(recipe.photo_url ?? null);
      if (url) {
        const b64 = await fetchImageAsBase64(url);
        if (b64) images[recipe.id] = b64;
      }
      imagesCompleted += 1;
      onProgress?.('images', imagesCompleted, imageTotal);
    })
  );

  let iconBase64: string | null = null;
  if (iconUri) {
    iconBase64 = await fetchImageAsBase64(iconUri);
    // Fallback: Image + Canvas without crossOrigin (same-origin assets don't need it,
    // and setting crossOrigin on a URL without CORS headers poisons the browser cache on Safari)
    if (!iconBase64) {
      iconBase64 = await new Promise<string | null>((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth || 512;
            c.height = img.naturalHeight || 512;
            c.getContext('2d')!.drawImage(img, 0, 0);
            resolve(c.toDataURL('image/png'));
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        // Cache-bust to avoid serving a poisoned CORS-failed response from earlier attempts
        img.src = `${iconUri}${iconUri.includes('?') ? '&' : '?'}_cb=${Date.now()}`;
      });
    }
  }

  if (Platform.OS === 'web') {
    // Pre-crop images to the recipe photo aspect ratio (55% of 710px × 280px ≈ 391:280)
    // so html2canvas renders them at full resolution without needing object-fit.
    const croppedImages: Record<string, string> = {};
    await Promise.all(
      Object.entries(images).map(async ([id, b64]) => {
        croppedImages[id] = await cropToAspect(b64, 391, 280);
      })
    );

    const html = buildCookbookHTML(recipes, croppedImages, iconBase64, iconUri);

    // Render HTML (with its embedded CSS) in a hidden iframe so styles apply correctly
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1px;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      iframe.srcdoc = html;
    });

    // Remove the print banner before capturing
    iframe.contentDocument?.querySelector('.print-banner')?.remove();

    const [{ buildPDFFromJpegs }, html2canvasMod] = await Promise.all([
      import('./pdf-minimal'),
      import('html2canvas'),
    ]);
    const html2canvas = (html2canvasMod as any).default ?? html2canvasMod;

    const pages = Array.from(
      iframe.contentDocument!.querySelectorAll('.cover-page, .index-container, .recipe-page')
    ) as HTMLElement[];

    const jpegs: Uint8Array[] = [];
    const pageTotal = pages.length;
    onProgress?.('pages', 0, pageTotal);
    let pagesCompleted = 0;
    for (const pageEl of pages) {
      pageEl.style.cssText += ';width:794px;min-height:unset;height:1123px;overflow:hidden;';
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        width: 794,
        height: 1123,
        windowWidth: 794,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const b64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
      jpegs.push(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
      pagesCompleted += 1;
      onProgress?.('pages', pagesCompleted, pageTotal);
    }

    document.body.removeChild(iframe);

    const pdfBytes = buildPDFFromJpegs(jpegs);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mis-Recetas-QueCocinarHoy-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const html = buildCookbookHTML(recipes, images, iconBase64, iconUri);
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  onProgress?.('done', 1, 1);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Mis Recetas — QuéCocinarHoy',
      UTI: 'com.adobe.pdf',
    });
  }
}

export function exportRecipesAsJSON(recipes: Recipe[]): void {
  const json = JSON.stringify(recipes, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `recetas-quecocinarhoy-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
