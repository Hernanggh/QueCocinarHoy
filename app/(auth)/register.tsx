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
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/context/auth';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Completa todos los campos');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password);
      Alert.alert(
        'Cuenta creada',
        'Revisa tu correo para confirmar tu cuenta, o inicia sesión si la confirmación está deshabilitada.',
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      setError(e.message ?? 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: pc('secondarySystemBackground'),
    padding: 14,
    borderRadius: 10,
    borderCurve: 'continuous' as const,
    fontSize: 16,
    color: pc('label'),
  };

  const labelStyle = {
    fontSize: 13,
    color: pc('secondaryLabel'),
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 4, marginBottom: 8 }}>
          <Text style={{ fontSize: 34, fontWeight: '700', color: pc('label') }}>
            Crear cuenta
          </Text>
          <Text style={{ fontSize: 17, color: pc('secondaryLabel') }}>
            Empieza a guardar tus recetas
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
            <Text style={labelStyle}>Correo</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              style={inputStyle}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={labelStyle}>Contraseña</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              autoComplete="new-password"
              style={inputStyle}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={labelStyle}>Confirmar contraseña</Text>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repite la contraseña"
              secureTextEntry
              autoComplete="new-password"
              style={inputStyle}
            />
          </View>
        </View>

        <Pressable
          onPress={handleRegister}
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
              Crear cuenta
            </Text>
          )}
        </Pressable>

        <Link href="/(auth)/login" asChild>
          <Pressable style={{ alignItems: 'center', padding: 8 }}>
            <Text style={{ color: pc('systemOrange'), fontSize: 15 }}>
              ¿Ya tienes cuenta? Inicia sesión
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
