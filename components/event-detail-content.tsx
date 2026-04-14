import { pc } from '@/lib/colors';
import { View, Text, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { getPublicUrl } from '@/lib/storage';
import { DifficultyBadge } from '@/components/difficulty-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Event, Recipe } from '@/types/app';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function RecipeThumbnail({ recipe }: { recipe: Recipe }) {
  const photoUrl = getPublicUrl(recipe.photo_url ?? null);

  if (!photoUrl) {
    return (
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 10,
          borderCurve: 'continuous',
          backgroundColor: pc('systemFill'),
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <IconSymbol name="fork.knife" size={22} color={pc('systemGray3')} />
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <img
        src={photoUrl}
        style={{
          width: 56,
          height: 56,
          objectFit: 'cover',
          borderRadius: 10,
          flexShrink: 0,
          display: 'block',
        } as any}
      />
    );
  }

  return (
    <Image
      source={{ uri: photoUrl }}
      style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0 }}
      contentFit="cover"
    />
  );
}

type Props = {
  event: Event;
  onEdit: () => void;
  onDelete: () => void;
  onRecipePress: (id: string) => void;
  onRemoveRecipe?: (recipeId: string) => void;
  onShoppingList: () => void;
  onSharePDF?: () => void;
};

export function EventDetailContent({
  event,
  onEdit,
  onDelete,
  onRecipePress,
  onRemoveRecipe,
  onShoppingList,
  onSharePDF,
}: Props) {
  return (
    <View style={{ padding: 16, gap: 20 }}>
      {/* Info del evento */}
      <View
        style={{
          backgroundColor: pc('secondarySystemBackground'),
          borderRadius: 16,
          borderCurve: 'continuous',
          padding: 16,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconSymbol name="calendar" size={18} color={pc('systemOrange')} />
          <Text style={{ fontSize: 15, color: pc('label'), flex: 1 }}>
            {formatDate(event.event_date)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconSymbol name="person.2.fill" size={18} color={pc('systemOrange')} />
          <Text style={{ fontSize: 15, color: pc('label') }}>
            {event.guest_count} {event.guest_count === 1 ? 'persona' : 'personas'}
          </Text>
        </View>
        {event.event_time ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <IconSymbol name="clock" size={18} color={pc('systemOrange')} />
            <Text style={{ fontSize: 15, color: pc('label') }}>{event.event_time}</Text>
          </View>
        ) : null}
        {event.location ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <IconSymbol name="mappin" size={18} color={pc('systemOrange')} />
            <Text style={{ fontSize: 15, color: pc('label'), flex: 1 }}>{event.location}</Text>
          </View>
        ) : null}
        {event.notes && (
          <Text selectable style={{ fontSize: 15, color: pc('secondaryLabel'), lineHeight: 22 }}>
            {event.notes}
          </Text>
        )}
      </View>

      {/* Recetas del evento */}
      {event.recipes.length > 0 ? (
        <View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: pc('label'),
              marginBottom: 12,
            }}
          >
            Menú ({event.recipes.length})
          </Text>
          <View style={{ gap: 10 }}>
            {event.recipes.map((recipe) => (
              <Pressable
                key={recipe.id}
                onPress={() => onRecipePress(recipe.id)}
                style={({ pressed }) => ({
                  backgroundColor: pc('secondarySystemBackground'),
                  borderRadius: 12,
                  borderCurve: 'continuous',
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <RecipeThumbnail recipe={recipe} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{ fontSize: 16, fontWeight: '600', color: pc('label') }}
                    numberOfLines={1}
                  >
                    {recipe.name}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <DifficultyBadge difficulty={recipe.difficulty} />
                    {recipe.categories.length > 0 && (
                      <Text style={{ fontSize: 13, color: pc('secondaryLabel') }}>
                        {recipe.categories.map((c) => c.name).join(' · ')}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 13, color: pc('secondaryLabel') }}>
                    {recipe.ingredients.length} ingredientes · {recipe.base_servings} porciones base
                  </Text>
                </View>
                {onRemoveRecipe ? (
                  <Pressable
                    onPress={(e) => {
                      if (Platform.OS === 'web') (e as any).stopPropagation?.();
                      onRemoveRecipe(recipe.id);
                    }}
                    hitSlop={8}
                  >
                    <IconSymbol name="xmark.circle.fill" size={22} color={pc('systemGray3')} />
                  </Pressable>
                ) : (
                  <IconSymbol name="chevron.right" size={16} color={pc('systemGray3')} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View
          style={{
            padding: 24,
            alignItems: 'center',
            backgroundColor: pc('secondarySystemBackground'),
            borderRadius: 16,
            borderCurve: 'continuous',
          }}
        >
          <Text style={{ fontSize: 15, color: pc('secondaryLabel'), textAlign: 'center' }}>
            No hay recetas en este evento. Edítalo para agregar recetas.
          </Text>
        </View>
      )}

      {/* Botón compartir PDF */}
      {onSharePDF && (
        <Pressable
          onPress={onSharePDF}
          style={({ pressed }) => ({
            borderWidth: 1.5,
            borderColor: pc('systemOrange'),
            padding: 16,
            borderRadius: 14,
            borderCurve: 'continuous',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <IconSymbol name="doc.fill" size={20} color={pc('systemOrange')} />
          <Text style={{ color: pc('systemOrange'), fontSize: 17, fontWeight: '600' }}>
            Compartir menú como PDF
          </Text>
        </Pressable>
      )}

      {/* Botón lista del súper */}
      <Pressable
        onPress={onShoppingList}
        style={({ pressed }) => ({
          backgroundColor: pc('systemOrange'),
          padding: 16,
          borderRadius: 14,
          borderCurve: 'continuous',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <IconSymbol name="cart" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
          Lista del súper
        </Text>
      </Pressable>
    </View>
  );
}
