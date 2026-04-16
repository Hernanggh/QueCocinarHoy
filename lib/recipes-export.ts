import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getPublicUrl } from '@/lib/storage';
import type { Recipe } from '@/types/app';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
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

function buildIndex(recipes: Recipe[]): string {
  // Agrupar por categoría de mayor prioridad
  const groups = new Map<string, Recipe[]>();
  for (const r of recipes) {
    const cat = priorityCat(r);
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(r);
  }

  // Ordenar secciones según CATEGORY_ORDER; categorías desconocidas al final
  const orderedKeys = [
    ...CATEGORY_ORDER.filter((c) => groups.has(c)),
    ...[...groups.keys()].filter((k) => !CATEGORY_ORDER.includes(k)),
  ];

  let pageNum = 3; // portada=1, índice=2, recetas desde 3
  const sections: string[] = [];

  for (const cat of orderedKeys) {
    const catRecipes = groups.get(cat)!;
    const rows = catRecipes.map((r) => {
      const row = `
        <div class="index-row">
          <span class="index-name">${r.name}</span>
          <span class="index-dots"></span>
          <span class="index-page">${pageNum}</span>
        </div>`;
      pageNum += 1 + (r.variations?.length ?? 0);
      return row;
    }).join('');

    sections.push(`
      <div class="index-section">
        <div class="index-cat">${cat}</div>
        ${rows}
      </div>`);
  }

  return sections.join('');
}

// ─── Recipe page ─────────────────────────────────────────────────────────────

function buildRecipePage(
  recipe: Recipe,
  parentName: string | null,
  photoSrc: string | null,
  pageNum: number
): string {
  const imgSrc = photoSrc ?? PLACEHOLDER_SVG;
  const time = totalTime(recipe);
  const diff = difficultyLabel[recipe.difficulty] ?? recipe.difficulty;
  const diffColor = difficultyColor[recipe.difficulty] ?? '#8e8e93';
  const cats = recipe.categories.map((c) => c.name).join(' · ');
  const methods = recipe.methods.map((m) => m.name).join(' · ');

  const variationTag = parentName
    ? `<div class="variation-tag">Variación de: ${parentName}</div>`
    : '';

  const descriptionBlock = recipe.description
    ? `<div class="recipe-description">"${recipe.description}"</div>`
    : '';

  const notesBlock = recipe.notes
    ? `<div class="notes-block"><span class="notes-label">Notas del chef</span> ${recipe.notes}</div>`
    : '';

  const ingredientsHtml = recipe.ingredients
    .sort((a, b) => a.order_index - b.order_index)
    .map((i) => `<div class="ingredient-item">${i.quantity} ${i.unit} ${i.name}</div>`)
    .join('');

  const stepsHtml = recipe.steps
    .sort((a, b) => a.order_index - b.order_index)
    .map((s, idx) => `
      <div class="step-row">
        <span class="step-num">${idx + 1}</span>
        <span class="step-text">${s.description}</span>
      </div>`)
    .join('');

  return `
  <div class="recipe-page">
    ${variationTag}

    <div class="recipe-top">
      <img class="recipe-photo" src="${imgSrc}" alt="${recipe.name}" />
      <div class="recipe-right">
        <div class="recipe-title-bar">
          <div class="title-accent"></div>
          <h1 class="recipe-title">${recipe.name.toUpperCase()}</h1>
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

// ─── Full HTML ───────────────────────────────────────────────────────────────

function buildCookbookHTML(recipes: Recipe[], images: Record<string, string>, iconBase64: string | null): string {
  const flat = flattenRecipes(recipes);
  const totalRecipes = recipes.length;
  const month = currentMonthYear();

  const logoHTML = iconBase64
    ? `<img class="cover-logo-img" src="${iconBase64}" alt="Logo" />`
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

  // Índice
  const indexHTML = `
  <div class="index-container">
    <div class="index-title">Índice</div>
    ${buildIndex(recipes)}
    <div class="page-footer">2</div>
  </div>`;

  // Páginas de recetas
  let pageNum = 3;
  const recipePages = flat.map(({ recipe, parentName }) => {
    const page = buildRecipePage(recipe, parentName, images[recipe.id] ?? null, pageNum);

    pageNum++;
    return page;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Mis Recetas — QuéCocinarHoy</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 210mm;
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      color: #1c1c1e;
      background: #fff;
      font-size: 14px;
      line-height: 1.5;
    }

    /* ── Cover ── */
    .cover-page {
      width: 210mm;
      min-height: 297mm;
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
      width: 210mm;
      min-height: 297mm;
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
      width: 210mm;
      min-height: 297mm;
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
      object-fit: cover;
      border-radius: 8px;
      flex-shrink: 0;
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
  ${coverHTML}
  ${indexHTML}
  ${recipePages}
</body>
</html>`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function exportRecipesAsPDF(recipes: Recipe[], iconUri?: string): Promise<void> {
  // Fetch all photos (base recipes + variations) + app icon
  const allRecipes = recipes.flatMap((r) => [r, ...(r.variations ?? [])]);
  const images: Record<string, string> = {};
  await Promise.all(
    allRecipes.map(async (recipe) => {
      const url = getPublicUrl(recipe.photo_url ?? null);
      if (url) {
        const b64 = await fetchImageAsBase64(url);
        if (b64) images[recipe.id] = b64;
      }
    })
  );

  let iconBase64: string | null = null;
  if (iconUri) {
    iconBase64 = await fetchImageAsBase64(iconUri);
  }

  const html = buildCookbookHTML(recipes, images, iconBase64);

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 800);
    }
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
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
