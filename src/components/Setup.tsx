import type { Category, CustomUsage, DifficultyChoice } from '../lib/types';
import { CATEGORIES } from '../lib/categories';
import { MAX_PLAYERS, type Mode, type Settings } from '../settings';
import Logo from './Logo';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onStart: () => void;
  onEditor: () => void;
  customCount: number;
  bankCount: number;
  available: { total: number; unused: number; minPerLetter: number };
  historyCount: number;
  onResetHistory: () => void;
}

const TIMES = [60, 90, 120, 150, 180, 240];

function Segmented<T extends string | number>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  testid: string;
}) {
  return (
    <fieldset className="field">
      <legend>{props.label}</legend>
      <div className="segmented" role="radiogroup" aria-label={props.label} data-testid={props.testid}>
        {props.options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={props.value === o.value}
            className={props.value === o.value ? 'on' : ''}
            onClick={() => props.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function Setup({
  settings,
  onChange,
  onStart,
  onEditor,
  customCount,
  bankCount,
  available,
  historyCount,
  onResetHistory,
}: Props) {
  const toggleCategory = (c: Category) => {
    const cur = settings.categories;
    const next = cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c];
    // Si quedan todas marcadas, es lo mismo que "Todas".
    set('categories', next.length === CATEGORIES.length ? [] : next);
  };
  const players = settings.names.length;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });
  const setCount = (n: number) => {
    const names = settings.names.slice(0, n);
    while (names.length < n) names.push(n === 1 ? 'Jugador' : `Equipo ${names.length + 1}`);
    if (n === 1 && names[0] === 'Equipo 1') names[0] = 'Jugador';
    if (n > 1 && names[0] === 'Jugador') names[0] = 'Equipo 1';
    set('names', names);
  };

  return (
    <main className="setup" data-testid="setup">
      <Logo />
      <p className="tagline">El rosco para jugar en familia</p>

      <div className="setup-card">
        <Segmented
          label="Jugadores / equipos"
          testid="players-count"
          value={settings.names.length}
          options={Array.from({ length: MAX_PLAYERS }, (_, i) => i + 1).map((n) => ({ value: n, label: String(n) }))}
          onChange={setCount}
        />
        <div className={`names ${players > 4 ? 'names-many' : ''}`}>
          {settings.names.map((name, i) => (
            <label key={i} className="name-input">
              <span className={`dot p${i}`} aria-hidden />
              <input
                value={name}
                maxLength={20}
                aria-label={`Nombre ${i + 1}`}
                data-testid={`name-${i}`}
                onChange={(e) => {
                  const names = settings.names.slice();
                  names[i] = e.target.value;
                  set('names', names);
                }}
              />
            </label>
          ))}
        </div>

        <Segmented<Mode>
          label="Modo de juego"
          testid="mode"
          value={settings.mode}
          options={[
            { value: 'presentador', label: '🎤 Presentador (tele)' },
            { value: 'escrita', label: '⌨️ Respuesta escrita' },
          ]}
          onChange={(v) => set('mode', v)}
        />
        <p className="hint">
          {settings.mode === 'presentador'
            ? 'Alguien lee la definición y marca Acierto / Error / Pasapalabra (o con el teclado: A, E, P).'
            : 'Cada jugador escribe la respuesta. Escribí «pasapalabra» o tocá el botón para pasar.'}
        </p>

        <Segmented<number>
          label="Tiempo por jugador"
          testid="time"
          value={settings.seconds}
          options={TIMES.map((t) => ({ value: t, label: `${t} s` }))}
          onChange={(v) => set('seconds', v)}
        />

        <Segmented<DifficultyChoice>
          label="Dificultad"
          testid="difficulty"
          value={settings.difficulty}
          options={[
            { value: 'facil', label: 'Fácil' },
            { value: 'media', label: 'Media' },
            { value: 'dificil', label: 'Difícil' },
            { value: 'mixta', label: 'Mixta' },
          ]}
          onChange={(v) => set('difficulty', v)}
        />

        <Segmented<CustomUsage>
          label={`Mis preguntas (${customCount})`}
          testid="custom"
          value={settings.custom}
          options={[
            { value: 'no', label: 'No usar' },
            { value: 'mezclar', label: 'Mezclar' },
            { value: 'priorizar', label: 'Priorizar' },
            { value: 'solo', label: 'Solo mías' },
          ]}
          onChange={(v) => set('custom', v)}
        />

        <fieldset className="field">
          <legend>Categorías</legend>
          <div className="chips-cat" data-testid="categories">
            <button
              type="button"
              aria-pressed={settings.categories.length === 0}
              className={settings.categories.length === 0 ? 'on' : ''}
              onClick={() => set('categories', [])}
            >
              ✨ Todas
            </button>
            {CATEGORIES.map((c) => {
              const on = settings.categories.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  className={on ? 'on' : ''}
                  data-cat={c.id}
                  onClick={() => toggleCategory(c.id)}
                >
                  {c.icon} {c.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="availability" data-testid="availability">
          <span>
            <b data-testid="avail-total">{available.total}</b> preguntas disponibles ·{' '}
            <b data-testid="avail-unused">{available.unused}</b> sin usar todavía
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            data-testid="reset-history"
            disabled={historyCount === 0}
            onClick={() => {
              if (window.confirm('¿Reiniciar el historial? Las preguntas ya jugadas vuelven a estar disponibles.')) onResetHistory();
            }}
          >
            ↺ Reiniciar historial ({historyCount})
          </button>
        </div>
        {available.minPerLetter < players && (
          <p className="hint warn" data-testid="avail-warn">
            Con estas categorías hay letras con menos de {players} preguntas: se completan con otras categorías.
          </p>
        )}

        <label className="toggle">
          <input type="checkbox" checked={settings.sound} onChange={(e) => set('sound', e.target.checked)} />
          <span>Sonidos</span>
        </label>
      </div>

      <div className="setup-actions">
        <button className="btn btn-primary btn-xl" data-testid="start" onClick={onStart}>
          ¡A jugar!
        </button>
        <button className="btn btn-ghost" data-testid="open-editor" onClick={onEditor}>
          ✏️ Editor de preguntas
        </button>
      </div>
      <p className="foot">{bankCount} preguntas en el banco · 25 letras (sin K ni W, como en el programa) · hasta {MAX_PLAYERS} jugadores</p>
    </main>
  );
}
