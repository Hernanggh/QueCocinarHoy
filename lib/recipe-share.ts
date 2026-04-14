import { Platform } from 'react-native';
import { getPublicUrl } from '@/lib/storage';
import type { Recipe } from '@/types/app';

// ─── Entrada pública ───────────────────────────────────────────────────────────

export async function shareRecipeAsImage(
  recipe: Recipe,
  captureCard?: () => Promise<string>,
) {
  if (Platform.OS === 'web') {
    await shareOnWeb(recipe);
  } else {
    if (!captureCard) return;
    const uri = await captureCard();
    const Sharing = require('expo-sharing');
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: recipe.name });
  }
}

// ─── Web: Canvas API → descarga PNG ───────────────────────────────────────────

async function shareOnWeb(recipe: Recipe) {
  const W = 600;
  const PHOTO_H = 380;
  const PAD = 26;
  const TEXT_W = W - PAD * 2;
  const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  // Canvas generoso — se recortará al contenido real al final
  const buf = document.createElement('canvas');
  buf.width = W;
  buf.height = 6000;
  const ctx = buf.getContext('2d');
  if (!ctx) { console.error('[shareRecipe] canvas 2d not available'); return; }

  ctx.fillStyle = '#1C1C1E';
  ctx.fillRect(0, 0, W, 6000);

  // ── Foto ──
  const photoUrl = getPublicUrl(recipe.photo_url);
  let photoOk = false;

  if (photoUrl) {
    try {
      const resp = await fetch(photoUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = blobUrl;
      });
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, PHOTO_H);
      ctx.clip();
      const s = Math.max(W / img.width, PHOTO_H / img.height);
      ctx.drawImage(img, (W - img.width * s) / 2, (PHOTO_H - img.height * s) / 2, img.width * s, img.height * s);
      ctx.restore();
      URL.revokeObjectURL(blobUrl);
      photoOk = true;
    } catch (e) {
      console.warn('[shareRecipe] photo load failed, using gradient:', e);
    }
  }
  if (!photoOk) {
    const g = ctx.createLinearGradient(0, 0, W, PHOTO_H);
    g.addColorStop(0, '#FF9500'); g.addColorStop(1, '#FF6000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, PHOTO_H);
  }

  // Gradiente oscuro sobre foto
  const fade = ctx.createLinearGradient(0, PHOTO_H - 220, 0, PHOTO_H);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,0.82)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, PHOTO_H - 220, W, 220);

  // Nombre sobre foto
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 36px ${FONT}`;
  const nameLines = wrapText(ctx, recipe.name, TEXT_W);
  let nameY = PHOTO_H - 24 - (nameLines.length - 1) * 44;
  for (const line of nameLines) { ctx.fillText(line, PAD, nameY); nameY += 44; }

  // ── Sección de texto ──
  let y = PHOTO_H + 24;

  const divider = () => {
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 20;
  };

  const sectionTitle = (title: string) => {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(title, PAD, y);
    y += 26;
  };

  // Descripción
  if (recipe.description) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `italic 15px ${FONT}`;
    for (const line of wrapText(ctx, recipe.description, TEXT_W).slice(0, 3)) {
      ctx.fillText(line, PAD, y); y += 22;
    }
    y += 6;
  }

  // Meta
  const totalTime = recipe.prep_time_min + recipe.cook_time_min;
  const meta: string[] = [];
  if (totalTime > 0) meta.push(`${totalTime} min`);
  meta.push(`${recipe.base_servings} porciones`);
  const diffMap: Record<string, string> = { facil: 'Fácil', medio: 'Intermedio', dificil: 'Difícil' };
  if (recipe.difficulty) meta.push(diffMap[recipe.difficulty] ?? recipe.difficulty);
  ctx.fillStyle = 'rgba(255,255,255,0.40)';
  ctx.font = `13px ${FONT}`;
  ctx.fillText(meta.join('  ·  '), PAD, y);
  y += 28;

  // ── Ingredientes (todos) ──
  if (recipe.ingredients.length > 0) {
    divider();
    sectionTitle('Ingredientes');
    ctx.font = `14px ${FONT}`;
    for (const ing of recipe.ingredients) {
      ctx.fillStyle = 'rgba(255,255,255,0.62)';
      ctx.fillText(`• ${ing.quantity} ${ing.unit} ${ing.name}`, PAD, y);
      y += 22;
    }
    y += 6;
  }

  // ── Pasos (todos) ──
  if (recipe.steps.length > 0) {
    divider();
    sectionTitle('Preparación');
    for (let i = 0; i < recipe.steps.length; i++) {
      const step = recipe.steps[i];
      const numStr = `${i + 1}.`;
      const indent = 28;

      // Número en naranja
      ctx.fillStyle = '#FF9500';
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText(numStr, PAD, y);

      // Texto del paso (con wrap e indentado)
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.font = `14px ${FONT}`;
      const stepLines = wrapText(ctx, step.description, TEXT_W - indent);
      for (let j = 0; j < stepLines.length; j++) {
        ctx.fillText(stepLines[j], PAD + indent, y + j * 20);
      }
      y += stepLines.length * 20 + 14;
    }
    y += 4;
  }

  // ── Notas ──
  if (recipe.notes) {
    divider();
    sectionTitle('Notas');
    ctx.fillStyle = 'rgba(255,255,255,0.58)';
    ctx.font = `14px ${FONT}`;
    for (const line of wrapText(ctx, recipe.notes, TEXT_W)) {
      ctx.fillText(line, PAD, y); y += 22;
    }
    y += 6;
  }

  // ── Branding ──
  y += 16;
  ctx.fillStyle = 'rgba(255,149,0,0.5)';
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillText('QueCocinarHoy', W - 118, y);
  y += 20;

  // Recortar canvas al contenido real
  const out = document.createElement('canvas');
  out.width = W;
  out.height = y + 10;
  const outCtx = out.getContext('2d')!;
  outCtx.drawImage(buf, 0, 0);

  let dataUrl: string;
  try {
    dataUrl = out.toDataURL('image/png');
  } catch (e) {
    console.error('[shareRecipe] toDataURL failed:', e);
    return;
  }

  // Mobile browser: Web Share API
  const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobileBrowser && navigator.share) {
    try {
      const r = await fetch(dataUrl);
      const b = await r.blob();
      const file = new File([b], `${recipe.name}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: recipe.name });
        return;
      }
    } catch (e) {
      console.warn('[shareRecipe] navigator.share failed:', e);
    }
  }

  // Desktop: descarga directa
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${recipe.name}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}
