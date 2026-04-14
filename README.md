# QueCocinarHoy

App de recetas y planificación de eventos gastronómicos. Permite organizar un recetario personal, planear cenas o reuniones asignando recetas a eventos, generar el menú en PDF y armar la lista del súper automáticamente.

## Stack

- **Expo Router** (v3) — navegación file-based, soporta iOS, Android y Web desde el mismo código
- **React Native** — UI nativa multiplataforma
- **Supabase** — base de datos PostgreSQL, autenticación y almacenamiento de fotos

## Variables de entorno

Crea un archivo `.env` en la raíz con las credenciales de tu proyecto Supabase:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Encuéntralas en tu proyecto de Supabase → Settings → API.

## Setup

```bash
npm install
npx expo start
```

Desde la terminal puedes abrir en:
- Simulador iOS (`i`)
- Emulador Android (`a`)
- Navegador web (`w`)

## Estructura de carpetas

```
app/
  (auth)/          # Login y registro
  (app)/
    (recipes)/     # Tab de recetas — listado, detalle, formulario
    (events)/      # Tab de eventos — listado, detalle, formulario
components/        # Componentes reutilizables (tarjetas, sheets, etc.)
hooks/             # useRecipes, useEvents, useLookupData
lib/               # supabase.ts, storage.ts, colors.ts, normalizers.ts
types/             # Tipos TypeScript (Recipe, Event, etc.)
```

## Funcionalidades

- **Recetas** — CRUD completo con foto, ingredientes, pasos, dificultad, categorías y métodos de cocción
- **Eventos** — planificación de cenas con fecha, hora, ubicación y número de personas
- **Menú** — asigna recetas a un evento desde el detalle de cada receta
- **PDF** — exporta el menú del evento como PDF por secciones
- **Lista del súper** — genera automáticamente los ingredientes sumados para todos los invitados
- **Filtros** — filtra recetas por categoría y método de cocción
