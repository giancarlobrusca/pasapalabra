# Pasapalabra en familia

Prototipo local del rosco estilo *Pasapalabra* para jugar en la tele (modo presentador), en la compu o en el celular.
Vite + React + TypeScript, sin backend. Preguntas propias en `localStorage`.

## Correr

```bash
npm install
npm run dev        # desarrollo
npm run build && npm run preview   # build de producción en http://localhost:4173
```

## Tests

```bash
npm run typecheck
npm test           # vitest: normalización, turnos/estados, selección y banco
npm run e2e        # Playwright contra build + preview (desktop 1920x1080 y mobile 390x844 DPR 2) + capturas
PW_BASE_URL=https://pasapalabra-psi.vercel.app npx playwright test --project desktop --project mobile  # contra producción
```

Producción: https://pasapalabra-psi.vercel.app (Vercel, team giancarlo-bruscas-projects).

## Atajos (modo presentador)

| Tecla | Acción |
| --- | --- |
| `Enter` / `Espacio` | Empezar turno / seguir tras pausa |
| `A` / `→` | Acierto |
| `E` / `←` | Error |
| `P` / `↓` | Pasapalabra |
| `R` | Ver / ocultar respuesta |
| `Esc` | Pausa |
| `M` | Sonido on/off |

`?seed=123` en la URL fija la selección de preguntas (útil para tests).

## Banco de preguntas

605 preguntas (mínimo 21 por letra) en 9 categorías: cine, música, deportes, geografía, comida, ciencia, historia, naturaleza y general.
Hasta 6 jugadores. Las preguntas usadas se guardan en un historial (`localStorage`) para no repetirlas entre partidas; cuando una letra se agota, su ciclo se reinicia. Botón «Reiniciar historial» en la configuración.

`src/data/bank.json`: `{ id, letter, type: "empieza" | "contiene", answer, alt[], definition, difficulty: "facil" | "media" | "dificil", category }`.
El mismo formato sirve para importar/exportar preguntas propias desde el editor.
