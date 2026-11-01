import { useEffect, useReducer, useRef, useState } from 'react';
import type { AnswerResult, GameState } from '../lib/types';
import { gameReducer, scoreOf } from '../lib/game';
import { prompt } from '../lib/letters';
import { isCorrectAnswer, isPassWord } from '../lib/normalize';
import { sfx } from '../lib/sound';
import type { Mode } from '../settings';
import Rosco from './Rosco';
import { CATEGORIES } from '../lib/categories';

interface Props {
  initial: GameState;
  mode: Mode;
  sound: boolean;
  missing: string[];
  onToggleSound: () => void;
  onFinish: (g: GameState) => void;
  onQuit: () => void;
}

export function formatTime(ms: number): string {
  return String(Math.ceil(ms / 1000));
}

export default function GameScreen({ initial, mode, sound, missing, onToggleSound, onFinish, onQuit }: Props) {
  const [state, dispatch] = useReducer(gameReducer, initial);
  const [reveal, setReveal] = useState(false);
  const [typed, setTyped] = useState('');
  const [toast, setToast] = useState<{ text: string; kind: AnswerResult; id: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const player = state.players[state.current];
  const slot = player.slots[player.index];
  const q = slot?.question;
  const multi = state.players.length > 1;
  const cat = q?.custom ? { id: 'propia', icon: '⭐', label: 'Propia' } : CATEGORIES.find((c) => c.id === q?.category);

  // Temporizador: solo corre en fase "playing".
  useEffect(() => {
    if (state.phase !== 'playing') return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: 'tick', ms: now - last });
      last = now;
    }, 100);
    return () => window.clearInterval(id);
  }, [state.phase]);

  // Pitido en los últimos 10 segundos.
  const secs = Math.ceil(player.timeLeftMs / 1000);
  useEffect(() => {
    if (state.phase === 'playing' && secs <= 10 && secs > 0) sfx.tick();
  }, [secs, state.phase]);

  // Efectos al responder.
  useEffect(() => {
    const l = state.last;
    if (!l) return;
    if (l.result === 'correct') sfx.correct();
    else if (l.result === 'wrong') sfx.wrong();
    else sfx.pass();
    const p = state.players[l.player];
    const s = p.slots.find((x) => x.letter === l.letter);
    const text =
      l.result === 'correct'
        ? '¡Correcto!'
        : l.result === 'wrong'
          ? `Era: ${s?.question.answer.toUpperCase() ?? ''}`
          : '¡Pasapalabra!';
    setToast({ text, kind: l.result, id: l.seq });
    const t = window.setTimeout(() => setToast(null), l.result === 'wrong' ? 2600 : 1100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.last?.seq]);

  // Fin de partida.
  useEffect(() => {
    if (state.phase === 'finished') {
      const t = window.setTimeout(() => onFinish(state), 900);
      return () => window.clearTimeout(t);
    }
  }, [state, onFinish]);

  // Al cambiar de letra/jugador: ocultar respuesta y limpiar input.
  useEffect(() => {
    setReveal(false);
    setTyped('');
    if (mode === 'escrita' && state.phase === 'playing') inputRef.current?.focus();
  }, [state.current, player.index, state.phase, mode]);

  const answer = (result: AnswerResult) => dispatch({ type: 'answer', result });
  const start = () => {
    sfx.start();
    dispatch({ type: 'start' });
  };

  // Atajos de teclado (también sirven con controles remotos que mandan flechas/Enter).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      const k = e.key.toLowerCase();
      if (state.phase === 'ready' && (k === 'enter' || k === ' ')) {
        e.preventDefault();
        start();
        return;
      }
      if (k === 'escape') {
        e.preventDefault();
        dispatch({ type: state.phase === 'paused' ? 'resume' : 'pause' });
        return;
      }
      if (state.phase === 'paused' && (k === 'enter' || k === ' ')) {
        e.preventDefault();
        dispatch({ type: 'resume' });
        return;
      }
      if (inInput) return;
      if (k === 'm') return onToggleSound();
      if (state.phase !== 'playing') return;
      if (k === 'r') return setReveal((v) => !v);
      if (mode !== 'presentador') return;
      if (k === 'a' || k === 'arrowright') answer('correct');
      else if (k === 'e' || k === 'arrowleft') answer('wrong');
      else if (k === 'p' || k === 'arrowdown') {
        e.preventDefault();
        answer('pass');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, mode, onToggleSound]);

  const submitTyped = () => {
    if (!q || state.phase !== 'playing') return;
    if (!typed.trim()) return;
    if (isPassWord(typed)) return answer('pass');
    answer(isCorrectAnswer(typed, q.answer, q.alt) ? 'correct' : 'wrong');
  };

  const score = scoreOf(player);
  const lowTime = secs <= 10;

  return (
    <main className={`game mode-${mode}`} data-testid="game" data-phase={state.phase}>
      <header className={`scoreboard ${state.players.length > 4 ? 'many' : ''}`} data-players={state.players.length}>
        <div className="chips">
        {state.players.map((p, i) => {
          const s = scoreOf(p);
          return (
            <div
              key={i}
              className={`chip p${i} ${i === state.current ? 'active' : ''} ${p.finished ? 'done' : ''}`}
              data-testid={`chip-${i}`}
            >
              <span className="chip-name">{p.name}</span>
              <span className="chip-score" data-testid={`score-${i}`}>
                {s.correct}
              </span>
              {multi && <span className="chip-time">{formatTime(p.timeLeftMs)}s</span>}
            </div>
          );
        })}
        </div>
        <div className="header-tools">
          <button className="icon-btn" aria-label={sound ? 'Silenciar' : 'Activar sonido'} onClick={onToggleSound}>
            {sound ? '🔊' : '🔇'}
          </button>
          <button
            className="icon-btn"
            aria-label="Pausa"
            data-testid="pause"
            onClick={() => dispatch({ type: state.phase === 'paused' ? 'resume' : 'pause' })}
          >
            {state.phase === 'paused' ? '▶' : '⏸'}
          </button>
          <button
            className="icon-btn"
            aria-label="Terminar partida"
            data-testid="end"
            onClick={() => {
              if (window.confirm('¿Terminar la partida y ver resultados?')) dispatch({ type: 'end' });
            }}
          >
            🏁
          </button>
        </div>
      </header>

      <section className="stage">
        <div className="rosco-wrap">
          <Rosco slots={player.slots} currentIndex={player.index} showCurrent={!player.finished} testid="rosco">
            <div className={`timer ${lowTime ? 'low' : ''}`} data-testid="timer">
              {formatTime(player.timeLeftMs)}
            </div>
            <div className="center-score">
              <span className="center-correct" data-testid="correct">
                {score.correct}
              </span>
              <span className="center-label">aciertos</span>
            </div>
            {multi && <div className="center-name">{player.name}</div>}
          </Rosco>
        </div>

        <div className="panel">
          {q && (
            <div className={`question ${toast ? `flash-${toast.kind}` : ''}`} data-testid="question">
              <div className="q-letter" data-testid="q-letter">
                {slot.letter}
              </div>
              <div className="q-body">
                <div className="q-prompt" data-testid="q-prompt">
                  {prompt(slot.letter, q.type)}:
                </div>
                {cat && (
                  <span className="q-cat" data-testid="q-cat" data-cat={cat.id}>
                    {cat.icon} {cat.label}
                  </span>
                )}
                <div className="q-def" data-testid="q-def">
                  {/* Durante el cartel de turno o la pausa no se deja leer la próxima definición. */}
                  {state.phase === 'ready' || state.phase === 'paused' ? '· · ·' : q.definition}
                </div>
              </div>
            </div>
          )}

          {mode === 'presentador' ? (
            <div className="reveal-row">
              <button
                className="btn btn-ghost reveal-btn"
                data-testid="reveal"
                onClick={() => setReveal((v) => !v)}
                disabled={state.phase !== 'playing'}
              >
                {reveal ? 'Ocultar respuesta' : 'Ver respuesta'} <kbd>R</kbd>
              </button>
              <span className={`answer ${reveal ? 'shown' : ''}`} data-testid="answer" aria-hidden={!reveal}>
                {reveal && q ? q.answer.toUpperCase() : '••••••'}
              </span>
            </div>
          ) : (
            <form
              className="typed"
              onSubmit={(e) => {
                e.preventDefault();
                submitTyped();
              }}
            >
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="Escribí tu respuesta…"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                disabled={state.phase !== 'playing'}
                data-testid="answer-input"
              />
              <button type="submit" className="btn btn-primary" disabled={state.phase !== 'playing'} data-testid="submit">
                Responder
              </button>
            </form>
          )}

          <div className={`controls ${mode === 'escrita' ? 'controls-typed' : ''}`}>
            {mode === 'presentador' && (
              <button
                className="big-btn ok"
                data-testid="btn-correct"
                onClick={() => answer('correct')}
                disabled={state.phase !== 'playing'}
              >
                <span className="big-icon">✓</span>
                <span className="big-label">Acierto</span>
                <kbd>A / →</kbd>
              </button>
            )}
            <button
              className="big-btn pass"
              data-testid="btn-pass"
              onClick={() => answer('pass')}
              disabled={state.phase !== 'playing'}
            >
              <span className="big-icon">↻</span>
              <span className="big-label">Pasapalabra</span>
              {mode === 'presentador' && <kbd>P / ↓</kbd>}
            </button>
            {mode === 'presentador' && (
              <button
                className="big-btn ko"
                data-testid="btn-wrong"
                onClick={() => answer('wrong')}
                disabled={state.phase !== 'playing'}
              >
                <span className="big-icon">✗</span>
                <span className="big-label">Error</span>
                <kbd>E / ←</kbd>
              </button>
            )}
          </div>
          {missing.length > 0 && <p className="hint">Sin preguntas para: {missing.join(', ')} (se omitieron).</p>}
        </div>
      </section>

      {toast && (
        <div key={toast.id} className={`toast toast-${toast.kind}`} data-testid="toast" role="status">
          {toast.text}
        </div>
      )}

      {(state.phase === 'ready' || state.phase === 'paused') && (
        <div className="overlay" data-testid={state.phase === 'ready' ? 'turn-overlay' : 'pause-overlay'}>
          <div className="overlay-card">
            {state.phase === 'ready' ? (
              <>
                <p className="overlay-kicker">{multi ? 'Turno de' : '¿Listos?'}</p>
                <h2 className={`overlay-title p${state.current}`} data-testid="turn-name">
                  {player.name}
                </h2>
                <p className="overlay-sub">
                  {formatTime(player.timeLeftMs)} segundos · {score.correct} aciertos
                </p>
                <button className="btn btn-primary btn-xl" data-testid="start-turn" onClick={start} autoFocus>
                  ▶ Empezar <kbd>Enter</kbd>
                </button>
              </>
            ) : (
              <>
                <h2 className="overlay-title">Pausa</h2>
                <button
                  className="btn btn-primary btn-xl"
                  data-testid="resume"
                  onClick={() => dispatch({ type: 'resume' })}
                  autoFocus
                >
                  ▶ Seguir <kbd>Enter</kbd>
                </button>
                <button className="btn btn-ghost" onClick={onQuit}>
                  Salir al inicio
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {state.phase === 'finished' && (
        <div className="overlay">
          <div className="overlay-card">
            <h2 className="overlay-title">¡Fin del rosco!</h2>
          </div>
        </div>
      )}
    </main>
  );
}
