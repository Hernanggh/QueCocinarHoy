import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { getPublicUrl } from '@/lib/storage';
import type { Recipe } from '@/types/app';

/**
 * Tarjeta compacta usada solo para captura de imagen (off-screen).
 * Ancho fijo 600px — se renderiza fuera de pantalla con react-native-view-shot.
 */
export function ShareableRecipeCard({ recipe }: { recipe: Recipe }) {
  const photoUrl = getPublicUrl(recipe.photo_url);
  const totalTime = recipe.prep_time_min + recipe.cook_time_min;
  const maxIng = Math.min(recipe.ingredients.length, 5);

  return (
    <View style={{ width: 600, backgroundColor: '#1C1C1E' }}>
      {/* Foto */}
      <View style={{ height: 380 }}>
        {photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <LinearGradient colors={['#FF9500', '#FF6000']} style={{ flex: 1 }} />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']}
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: 220,
            justifyContent: 'flex-end',
            padding: 24,
            paddingBottom: 28,
          }}
        >
          <Text
            style={{ color: '#fff', fontSize: 34, fontWeight: '800', lineHeight: 40 }}
            numberOfLines={2}
          >
            {recipe.name}
          </Text>
        </LinearGradient>
      </View>

      {/* Info */}
      <View style={{ padding: 24, gap: 10 }}>
        {!!recipe.description && (
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 17 }} numberOfLines={2}>
            {recipe.description}
          </Text>
        )}

        <View style={{ flexDirection: 'row', gap: 16 }}>
          {totalTime > 0 && (
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
              {totalTime} min
            </Text>
          )}
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            {recipe.base_servings} porciones
          </Text>
        </View>

        {maxIng > 0 && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.1)',
              paddingTop: 12,
              gap: 6,
            }}
          >
            <Text
              style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: 15,
                fontWeight: '700',
                marginBottom: 4,
              }}
            >
              Ingredientes
            </Text>
            {recipe.ingredients.slice(0, maxIng).map((ing, i) => (
              <Text key={i} style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>
                {'• '}{ing.quantity} {ing.unit} {ing.name}
              </Text>
            ))}
            {recipe.ingredients.length > maxIng && (
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                + {recipe.ingredients.length - maxIng} más
              </Text>
            )}
          </View>
        )}

        <Text
          style={{
            color: 'rgba(255,149,0,0.55)',
            fontSize: 12,
            fontWeight: '700',
            textAlign: 'right',
            marginTop: 4,
          }}
        >
          QueCocinarHoy
        </Text>
      </View>
    </View>
  );
}
