import { pc } from '@/lib/colors';
import { View, Text, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { getPublicUrl } from '@/lib/storage';
import { DifficultyBadge } from '@/components/difficulty-badge';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Recipe } from '@/types/app';

export function RecipeCard({ recipe, photoHeight = 180 }: { recipe: Recipe; photoHeight?: number }) {
  const photoUrl = getPublicUrl(recipe.photo_url);

  const totalTime = recipe.prep_time_min + recipe.cook_time_min;

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
      {/* Imagen con nombre en gradiente */}
      <View style={{ height: photoHeight }}>
        {photoUrl ? (
          Platform.OS === 'web' ? (
            <img
              src={photoUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover' } as any}
            />
          ) : (
            <Image
              source={{ uri: photoUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          )
        ) : (
          <View
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: pc('systemFill'),
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <IconSymbol name="fork.knife" size={44} color={pc('systemGray3')} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            paddingBottom: 14,
            paddingTop: 50,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 17,
              fontWeight: '700',
              lineHeight: 22,
            }}
            numberOfLines={2}
          >
            {recipe.name}
          </Text>
        </LinearGradient>
      </View>

      {/* Metadata */}
      <View
        style={{
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <DifficultyBadge difficulty={recipe.difficulty} />
        {totalTime > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <IconSymbol name="clock" size={13} color={pc('secondaryLabel')} />
            <Text style={{ fontSize: 13, color: pc('secondaryLabel') }}>
              {totalTime} min
            </Text>
          </View>
        )}
        {recipe.categories.map((cat) => (
          <View
            key={cat.id}
            style={{
              backgroundColor: '#FF950018',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              borderCurve: 'continuous',
            }}
          >
            <Text style={{ fontSize: 12, color: '#FF9500', fontWeight: '600' }}>
              {cat.name}
            </Text>
          </View>
        ))}
        {recipe.variations.length > 0 && (
          <Text style={{ fontSize: 12, color: pc('secondaryLabel') }}>
            {recipe.variations.length} {recipe.variations.length === 1 ? 'variación' : 'variaciones'}
          </Text>
        )}
      </View>
    </View>
  );
}
