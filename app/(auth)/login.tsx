import { pc } from '@/lib/colors';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/context/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e.message ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 4, marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 34,
              fontWeight: '700',
              color: pc('label'),
            }}
          >
            ¿Qué Cocinamos?
          </Text>
          <Text style={{ fontSize: 17, color: pc('secondaryLabel') }}>
            Inicia sesión para ver tus recetas
          </Text>
        </View>

        {error && (
          <View
            style={{
              backgroundColor: pc('systemRed'),
              padding: 12,
              borderRadius: 10,
              borderCurve: 'continuous',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14 }}>{error}</Text>
          </View>
        )}

        <View style={{ gap: 12 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, color: pc('secondaryLabel'), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Correo
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              style={{
                backgroundColor: pc('secondarySystemBackground'),
                padding: 14,
                borderRadius: 10,
                borderCurve: 'continuous',
                fontSize: 16,
                color: pc('label'),
              }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, color: pc('secondaryLabel'), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Contraseña
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="current-password"
              style={{
                backgroundColor: pc('secondarySystemBackground'),
                padding: 14,
                borderRadius: 10,
                borderCurve: 'continuous',
                fontSize: 16,
                color: pc('label'),
              }}
            />
          </View>
        </View>

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={({ pressed }) => ({
            backgroundColor: pc('systemOrange'),
            padding: 16,
            borderRadius: 12,
            borderCurve: 'continuous',
            alignItems: 'center',
            opacity: pressed || loading ? 0.7 : 1,
          })}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
              Iniciar sesión
            </Text>
          )}
        </Pressable>

        <Link href="/(auth)/register" asChild>
          <Pressable style={{ alignItems: 'center', padding: 8 }}>
            <Text style={{ color: pc('systemOrange'), fontSize: 15 }}>
              ¿No tienes cuenta? Regístrate
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
