import { pc } from '@/lib/colors';
import { View, Text, Pressable, Linking, Platform } from 'react-native';
import { Image } from 'expo-image';
import { getPublicUrl } from '@/lib/storage';
import { DifficultyBadge } from '@/components/difficulty-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Recipe } from '@/types/app';

type Props = {
  recipe: Recipe;
  onEdit: () => void;
  onDelete: () => void;
  onSaucePress: (id: string) => void;
  onAddToEvent?: () => void;
  onShare?: () => void;
  onAddVariation?: () => void;
  onVariationPress?: (variation: Recipe) => void;
  parentName?: string | null;
};

export function RecipeDetailContent({ recipe, onEdit, onDelete, onSaucePress, onAddToEvent, onShare, onAddVariation, onVariationPress, parentName }: Props) {
  const photoUrl = getPublicUrl(recipe.photo_url ?? null);
  const totalTime = recipe.prep_time_min + recipe.cook_time_min;

  const sectionTitle = (text: string) => (
    <Text
      style={{
        fontSize: 20,
        fontWeight: '700',
        color: pc('label'),
        marginBottom: 12,
      }}
    >
      {text}
    </Text>
  );

  return (
    <View style={{ gap: 0 }}>
      {/* Foto */}
      {photoUrl && (
        Platform.OS === 'web' ? (
          <img
            src={photoUrl}
            style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' } as any}
          />
        ) : (
          <Image
            source={{ uri: photoUrl }}
            style={{ width: '100%', height: 280 }}
            contentFit="cover"
          />
        )
      )}

      {parentName && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 12 }}>
          <IconSymbol name="arrow.turn.up.left" size={13} color={pc('secondaryLabel')} />
          <Text style={{ fontSize: 13, color: pc('secondaryLabel') }}>
            Variación de: <Text style={{ fontWeight: '600' }}>{parentName}</Text>
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 12 }}>
        {onAddToEvent && (
          <Pressable
            onPress={onAddToEvent}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: '#FF950015',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <IconSymbol name="calendar.badge.plus" size={16} color="#FF9500" />
            <Text style={{ fontSize: 15, color: '#FF9500', fontWeight: '600' }}>
              Agregar a evento
            </Text>
          </Pressable>
        )}
        {onShare && (
          <Pressable
            onPress={onShare}
            style={({ pressed }) => ({
              flex: onAddToEvent ? 0 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              paddingHorizontal: onAddToEvent ? 16 : 0,
              borderRadius: 14,
              borderCurve: 'continuous',
              backgroundColor: '#FF950015',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <IconSymbol name="square.and.arrow.up" size={16} color="#FF9500" />
            {!onAddToEvent && (
              <Text style={{ fontSize: 15, color: '#FF9500', fontWeight: '600' }}>
                Compartir receta
              </Text>
            )}
          </Pressable>
        )}
      </View>

      <View style={{ padding: 16, gap: 20 }}>
        {/* Meta info */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <DifficultyBadge difficulty={recipe.difficulty} />
            {totalTime > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <IconSymbol name="clock" size={15} color={pc('secondaryLabel')} />
                <Text style={{ fontSize: 14, color: pc('secondaryLabel') }}>
                  {totalTime} min total
                  {recipe.prep_time_min > 0 && ` (${recipe.prep_time_min} prep`}
                  {recipe.cook_time_min > 0 && ` · ${recipe.cook_time_min} cocción)`}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <IconSymbol name="person.2.fill" size={15} color={pc('secondaryLabel')} />
              <Text style={{ fontSize: 14, color: pc('secondaryLabel') }}>
                {recipe.base_servings} porciones
              </Text>
            </View>
          </View>

          {recipe.categories.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {recipe.categories.map((cat) => (
                <View
                  key={cat.id}
                  style={{
                    backgroundColor: pc('systemOrange'),
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>
                    {cat.name}
                  </Text>
                </View>
              ))}
              {recipe.methods.map((m) => (
                <View
                  key={m.id}
                  style={{
                    backgroundColor: pc('secondarySystemBackground'),
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ fontSize: 13, color: pc('secondaryLabel') }}>
                    {m.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Descripción */}
        {recipe.description ? (
          <Text
            selectable
            style={{
              fontSize: 15,
              color: pc('secondaryLabel'),
              lineHeight: 22,
              fontStyle: 'italic',
            }}
          >
            {recipe.description}
          </Text>
        ) : null}

        {/* Ingredientes */}
        {recipe.ingredients.length > 0 && (
          <View>
            {sectionTitle(recipe.parent_recipe_id ? 'Ingredientes adicionales' : 'Ingredientes')}
            <View
              style={{
                backgroundColor: pc('secondarySystemBackground'),
                borderRadius: 12,
                borderCurve: 'continuous',
                overflow: 'hidden',
              }}
            >
              {recipe.ingredients.map((ing, idx) => (
                <View
                  key={ing.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    padding: 14,
                    borderBottomWidth: idx < recipe.ingredients.length - 1 ? 0.5 : 0,
                    borderBottomColor: pc('separator'),
                  }}
                >
                  <Text selectable style={{ fontSize: 16, color: pc('label'), flex: 1 }}>
                    {ing.name}
                  </Text>
                  <Text
                    selectable
                    style={{
                      fontSize: 16,
                      color: pc('secondaryLabel'),
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {ing.quantity} {ing.unit}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pasos */}
        {recipe.steps.length > 0 && (
          <View>
            {sectionTitle('Preparación')}
            <View style={{ gap: 16 }}>
              {recipe.steps.map((step, idx) => (
                <View key={step.id} style={{ flexDirection: 'row', gap: 12 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: pc('systemOrange'),
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                      {idx + 1}
                    </Text>
                  </View>
                  <Text
                    selectable
                    style={{ fontSize: 16, color: pc('label'), flex: 1, lineHeight: 24 }}
                  >
                    {step.description}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Salsas vinculadas */}
        {recipe.sauces.length > 0 && (
          <View>
            {sectionTitle('Salsas y aderezos')}
            <View style={{ gap: 8 }}>
              {recipe.sauces.map((sauce) => (
                <Pressable
                  key={sauce.id}
                  onPress={() => onSaucePress(sauce.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 14,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    backgroundColor: pc('secondarySystemBackground'),
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <IconSymbol name="drop.fill" size={18} color={pc('systemOrange')} />
                  <Text style={{ fontSize: 16, color: pc('label'), flex: 1 }}>
                    {sauce.name}
                  </Text>
                  <IconSymbol name="chevron.right" size={16} color={pc('systemGray3')} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Variaciones */}
        {(recipe.variations.length > 0 || onAddVariation) && !recipe.parent_recipe_id && (
          <View>
            {sectionTitle(`Variaciones${recipe.variations.length > 0 ? ` (${recipe.variations.length})` : ''}`)}
            <View style={{ gap: 8 }}>
              {recipe.variations.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => onVariationPress?.(v)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 14,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    backgroundColor: pc('secondarySystemBackground'),
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, color: pc('label'), fontWeight: '500' }}>
                      {v.name}
                    </Text>
                    {v.description ? (
                      <Text style={{ fontSize: 13, color: pc('secondaryLabel'), marginTop: 2 }} numberOfLines={2}>
                        {v.description}
                      </Text>
                    ) : v.ingredients.length > 0 && (
                      <Text style={{ fontSize: 13, color: pc('secondaryLabel'), marginTop: 2 }}>
                        +{v.ingredients.length} {v.ingredients.length === 1 ? 'ingrediente' : 'ingredientes'}
                      </Text>
                    )}
                  </View>
                  <IconSymbol name="chevron.right" size={16} color={pc('systemGray3')} />
                </Pressable>
              ))}
              {onAddVariation && (
                <Pressable
                  onPress={onAddVariation}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    borderWidth: 1.5,
                    borderColor: pc('systemOrange'),
                    borderStyle: 'dashed',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <IconSymbol name="plus" size={16} color={pc('systemOrange')} />
                  <Text style={{ fontSize: 15, color: pc('systemOrange'), fontWeight: '600' }}>
                    Agregar variación
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Notas */}
        {recipe.notes && (
          <View>
            {sectionTitle('Notas')}
            <Text
              selectable
              style={{ fontSize: 16, color: pc('secondaryLabel'), lineHeight: 24 }}
            >
              {recipe.notes}
            </Text>
          </View>
        )}

        {/* Link de referencia */}
        {recipe.reference_url && (
          <Pressable
            onPress={() => Linking.openURL(recipe.reference_url!)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              padding: 14,
              borderRadius: 12,
              borderCurve: 'continuous',
              backgroundColor: pc('secondarySystemBackground'),
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <IconSymbol name="arrow.up.right" size={18} color={pc('systemOrange')} />
            <Text
              style={{ fontSize: 15, color: pc('systemOrange'), flex: 1 }}
              numberOfLines={1}
            >
              Ver video de referencia
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
