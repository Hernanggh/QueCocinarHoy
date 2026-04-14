import { pc } from '@/lib/colors';
import { View, Text, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getPublicUrl } from '@/lib/storage';
import type { Event, Recipe } from '@/types/app';

// Paleta de colores para celdas sin foto (cicla por índice)
const CELL_COLORS = [
  ['#FF9500', '#FF6000'],
  ['#34C759', '#28A745'],
  ['#007AFF', '#0056CC'],
  ['#AF52DE', '#8A2BE2'],
  ['#FF2D55', '#CC0033'],
  ['#5AC8FA', '#1E90FF'],
];

function RecipeCell({
  recipe,
  style,
  index,
}: {
  recipe: Recipe;
  style: any;
  index: number;
}) {
  const photoUrl = getPublicUrl(recipe.photo_url ?? null);
  const colors = CELL_COLORS[index % CELL_COLORS.length] as [string, string];
  // Iniciales: primeras 2 palabras
  const initials = recipe.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  if (photoUrl) {
    if (Platform.OS === 'web') {
      return (
        <img
          src={photoUrl}
          style={{ ...style, objectFit: 'cover', display: 'block', minWidth: 0 } as any}
        />
      );
    }
    return <Image source={{ uri: photoUrl }} style={style} contentFit="cover" />;
  }

  // Sin foto: gradiente de color + iniciales
  return (
    <LinearGradient colors={colors} style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text
        style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: '800' }}
        numberOfLines={1}
      >
        {initials}
      </Text>
    </LinearGradient>
  );
}

function EmptyCell({ style }: { style: any }) {
  return <View style={[style, { backgroundColor: pc('systemFill') }]} />;
}

function PhotoCollage({ recipes, height }: { recipes: Recipe[]; height: number }) {
  const n = recipes.length;
  const half = Math.floor(height / 2);
  const gap = 1;

  // 1 foto → pantalla completa
  if (n === 1) {
    return <RecipeCell recipe={recipes[0]} style={{ width: '100%', height }} index={0} />;
  }

  // 2 fotos → split 50/50 vertical
  if (n === 2) {
    return (
      <View style={{ flexDirection: 'row', height }}>
        <RecipeCell recipe={recipes[0]} style={{ flex: 1, height, minWidth: 0 }} index={0} />
        <View style={{ width: gap, backgroundColor: pc('systemBackground') }} />
        <RecipeCell recipe={recipes[1]} style={{ flex: 1, height, minWidth: 0 }} index={1} />
      </View>
    );
  }

  // 3-4 fotos → grid 2x2 (celda vacía gris si solo hay 3)
  // 5+ → mostrar las primeras 4
  const cells = recipes.slice(0, 4);
  const cellH = half - Math.floor(gap / 2);
  return (
    <View style={{ height }}>
      {/* Fila superior */}
      <View style={{ flexDirection: 'row', height: cellH }}>
        <RecipeCell recipe={cells[0]} style={{ flex: 1, height: cellH, minWidth: 0 }} index={0} />
        <View style={{ width: gap, backgroundColor: pc('systemBackground') }} />
        <RecipeCell recipe={cells[1]} style={{ flex: 1, height: cellH, minWidth: 0 }} index={1} />
      </View>
      <View style={{ height: gap, backgroundColor: pc('systemBackground') }} />
      {/* Fila inferior */}
      <View style={{ flexDirection: 'row', height: cellH }}>
        {cells[2] ? (
          <RecipeCell recipe={cells[2]} style={{ flex: 1, height: cellH, minWidth: 0 }} index={2} />
        ) : (
          <EmptyCell style={{ flex: 1, height: cellH }} />
        )}
        <View style={{ width: gap, backgroundColor: pc('systemBackground') }} />
        {cells[3] ? (
          <RecipeCell recipe={cells[3]} style={{ flex: 1, height: cellH, minWidth: 0 }} index={3} />
        ) : (
          <EmptyCell style={{ flex: 1, height: cellH }} />
        )}
      </View>
    </View>
  );
}

export function EventCard({ event, photoHeight = 180 }: { event: Event; photoHeight?: number }) {
  const date = new Date(event.event_date + 'T12:00:00');
  const day = date.getDate();
  const month = date.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase().replace('.', '');
  const year = date.getFullYear();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPast = date < today;

  const collageRecipes = event.recipes.slice(0, 4);
  const hasRecipes = collageRecipes.length > 0;

  return (
    <View
      style={{
        borderRadius: 20,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: pc('secondarySystemBackground'),
        boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
      }}
    >
      {/* Área visual */}
      <View style={{ height: photoHeight }}>
        {hasRecipes ? (
          <PhotoCollage recipes={collageRecipes} height={photoHeight} />
        ) : (
          /* Sin recetas: gradiente naranja con fecha grande */
          <LinearGradient
            colors={isPast ? ['#9E9E9E', '#757575'] : ['#FF9500', '#FF6000']}
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: photoHeight > 120 ? 52 : 38,
                fontWeight: '800',
                lineHeight: photoHeight > 120 ? 56 : 42,
              }}
            >
              {day}
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: 13,
                fontWeight: '700',
                letterSpacing: 1,
                marginTop: 2,
              }}
            >
              {month} {year}
            </Text>
          </LinearGradient>
        )}

        {/* Badge de fecha (cuando hay recetas en el collage) */}
        {hasRecipes && (
          <View
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              backgroundColor: isPast ? 'rgba(60,60,60,0.80)' : 'rgba(255,149,0,0.90)',
              borderRadius: 10,
              paddingHorizontal: 9,
              paddingVertical: 4,
              flexDirection: 'row',
              alignItems: 'baseline',
              gap: 4,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{day}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
              {month} {year}
            </Text>
          </View>
        )}

        {/* Badge "Pasado" */}
        {isPast && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: 'rgba(0,0,0,0.35)',
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>Pasado</Text>
          </View>
        )}

        {/* Badge de hora */}
        {event.event_time && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(0,0,0,0.30)',
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <IconSymbol name="clock" size={11} color="rgba(255,255,255,0.9)" />
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' }}>
              {event.event_time.slice(0, 5)}
            </Text>
          </View>
        )}
      </View>

      {/* Nombre + metadata */}
      <View style={{ padding: 12, gap: 6 }}>
        <Text
          style={{ fontSize: 15, fontWeight: '700', color: pc('label'), lineHeight: 20 }}
          numberOfLines={2}
        >
          {event.name}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <IconSymbol name="person.2.fill" size={13} color={pc('secondaryLabel')} />
            <Text style={{ fontSize: 13, color: pc('secondaryLabel') }}>
              {event.guest_count}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <IconSymbol name="fork.knife" size={13} color={pc('secondaryLabel')} />
            <Text style={{ fontSize: 13, color: pc('secondaryLabel') }}>
              {event.recipes.length}
            </Text>
          </View>
          {event.location && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <IconSymbol name="mappin" size={13} color={pc('secondaryLabel')} />
              <Text style={{ fontSize: 13, color: pc('secondaryLabel') }} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
