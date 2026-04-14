import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getPublicUrl } from '@/lib/storage';
import type { Event, Recipe } from '@/types/app';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

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

// Placeholder SVG (fork & knife) encoded inline — no external assets needed
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Crect width='56' height='56' fill='%23e5e5ea' rx='10'/%3E%3Ctext x='28' y='34' font-size='22' text-anchor='middle' fill='%23aeaeb2'%3E🍽%3C/text%3E%3C/svg%3E`;

// ─── HTML generation ────────────────────────────────────────────────────────

function recipeRow(recipe: Recipe, photoSrc: string | null, compact: boolean): string {
  const photoSize = compact ? 56 : 72;

  const imgSrc = photoSrc ?? PLACEHOLDER_SVG;
  const photoHtml = `<img class="recipe-photo" src="${imgSrc}" width="${photoSize}" height="${photoSize}" alt="${recipe.name}" />`;

  const descriptionHtml = recipe.description
    ? `<div class="recipe-description">${recipe.description}</div>`
    : '';

  return `
  <div class="recipe-row${compact ? ' compact' : ''}">
    ${photoHtml}
    <div class="recipe-info">
      <div class="recipe-name">${recipe.name}${recipe.variation_name ? ` <span style="font-weight:400;color:#888"> · ${recipe.variation_name}</span>` : ''}</div>
      ${descriptionHtml}
    </div>
  </div>`;
}

const SECTIONS = [
  { key: 'entrada',           label: 'Entrada' },
  { key: 'plato fuerte',      label: 'Plato Fuerte' },
  { key: 'acompañamiento',    label: 'Acompañamiento' },
  { key: 'salsas y aderezos', label: 'Salsas y Aderezos' },
  { key: 'postre',            label: 'Postre' },
];

function recipeSectionIndex(recipe: Recipe): number {
  for (let i = 0; i < SECTIONS.length; i++) {
    if (recipe.categories.some((c) => c.name.toLowerCase() === SECTIONS[i].key)) return i;
  }
  return SECTIONS.length; // sin categoría conocida → al final
}

function buildHTML(event: Event, images: Record<string, string>): string {
  const useGrid = event.recipes.length > 6;

  // Agrupar recetas por sección
  const groups = new Map<number, Recipe[]>();
  for (const recipe of event.recipes) {
    const idx = recipeSectionIndex(recipe);
    if (!groups.has(idx)) groups.set(idx, []);
    groups.get(idx)!.push(recipe);
  }

  // Renderizar secciones en orden
  const sectionKeys = [...groups.keys()].sort((a, b) => a - b);
  const recipesHTML = sectionKeys.map((idx) => {
    const recipes = groups.get(idx)!;
    const label = idx < SECTIONS.length ? SECTIONS[idx].label : null;
    const header = label ? `<div class="section-header">${label}</div>` : '';
    const rows = recipes.map((r) => recipeRow(r, images[r.id] ?? null, useGrid)).join('');
    return `${header}<div class="recipes-container${useGrid ? ' grid' : ''}">${rows}</div>`;
  }).join('');

  const notesBlock = event.notes
    ? `<div class="event-notes">"${event.notes}"</div>`
    : '';

  const recipesSection = event.recipes.length > 0
    ? `<div class="menu-label">── Menú ──</div>${recipesHTML}`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${event.name}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: 210mm;
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      color: #1c1c1e;
      background: #fff;
      font-size: 14px;
      line-height: 1.4;
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #FF9500 0%, #FF6B35 100%);
      color: #fff;
      padding: 32px 40px 28px;
      text-align: center;
    }
    .header-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      opacity: 0.8;
      margin-bottom: 8px;
    }
    .event-title {
      font-size: 34px;
      font-weight: 800;
      line-height: 1.15;
      margin-bottom: 12px;
    }
    .event-meta-header {
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 14px;
      opacity: 0.92;
    }
    .event-meta-header span {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    /* ── Notes ── */
    .event-notes {
      margin: 16px 32px;
      padding: 12px 20px;
      background: #fff8f0;
      border-left: 3px solid #FF9500;
      border-radius: 0 10px 10px 0;
      font-size: 13px;
      color: #555;
      font-style: italic;
      line-height: 1.5;
    }

    /* ── Content ── */
    .content {
      padding: 0 24px 24px;
    }

    /* ── Section headers ── */
    .section-header {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      color: #FF9500;
      margin: 14px 0 6px;
      padding-bottom: 5px;
      border-bottom: 1.5px solid rgba(255,149,0,0.25);
    }

    /* ── Menu label ── */
    .menu-label {
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #8e8e93;
      margin: 16px 0 12px;
    }

    /* ── Recipes container ── */
    .recipes-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .recipes-container.grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    /* ── Recipe row ── */
    .recipe-row {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f9f9fb;
      border-radius: 12px;
      padding: 10px 14px 10px 10px;
      border: 1px solid #e5e5ea;
    }
    .recipe-row.compact {
      padding: 8px 12px 8px 8px;
      gap: 10px;
      border-radius: 10px;
    }
    .recipe-photo {
      border-radius: 8px;
      object-fit: cover;
      flex-shrink: 0;
      display: block;
    }
    .recipe-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .recipe-name {
      font-size: 15px;
      font-weight: 700;
      color: #1c1c1e;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .recipe-row.compact .recipe-name {
      font-size: 13px;
    }
    .recipe-description {
      font-size: 12px;
      color: #8e8e93;
      font-style: italic;
      line-height: 1.4;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .recipe-chips {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    .diff-badge {
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
      white-space: nowrap;
    }
    .recipe-meta-text {
      font-size: 12px;
      color: #8e8e93;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Footer ── */
    .footer {
      text-align: center;
      padding: 16px;
      font-size: 11px;
      color: #aeaeb2;
      border-top: 0.5px solid #e5e5ea;
      margin-top: 8px;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-label">Menú especial</div>
    <div class="event-title">${event.name}</div>
    <div class="event-meta-header">
      <span>📅 ${formatDate(event.event_date)}</span>
      ${event.event_time ? `<span>🕐 ${event.event_time}</span>` : ''}
      <span>👥 ${event.guest_count} ${event.guest_count === 1 ? 'persona' : 'personas'}</span>
      ${event.location ? `<span>📍 ${event.location}</span>` : ''}
      ${event.recipes.length > 0 ? `<span>🍽 ${event.recipes.length} ${event.recipes.length === 1 ? 'platillo' : 'platillos'}</span>` : ''}
    </div>
  </div>

  ${notesBlock}

  <div class="content">
    ${recipesSection}
  </div>

  <div class="footer">Generado con QueCocinarHoy</div>

</body>
</html>`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function generateAndShareEventPDF(event: Event): Promise<void> {
  // Fetch all recipe photos as base64
  const images: Record<string, string> = {};
  await Promise.all(
    event.recipes.map(async (recipe) => {
      const url = getPublicUrl(recipe.photo_url ?? null);
      if (url) {
        const b64 = await fetchImageAsBase64(url);
        if (b64) images[recipe.id] = b64;
      }
    })
  );

  const html = buildHTML(event, images);

  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      // Small delay to let images load before printing
      setTimeout(() => win.print(), 800);
    }
    return;
  }

  // Mobile: generate PDF file and open share sheet
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Menú — ${event.name}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
