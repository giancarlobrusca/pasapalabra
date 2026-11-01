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
```

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

`src/data/bank.json`: `{ id, letter, type: "empieza" | "contiene", answer, alt[], definition, difficulty: "facil" | "media" | "dificil" }`.
El mismo formato sirve para importar/exportar preguntas propias desde el editor.
