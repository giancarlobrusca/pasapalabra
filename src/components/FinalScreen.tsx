import { useEffect, useRef } from 'react';
import type { GameState } from '../lib/types';
import { scoreOf, winners } from '../lib/game';
import { prompt } from '../lib/letters';
import { sfx } from '../lib/sound';
import Rosco from './Rosco';

interface Props {
  game: GameState;
  sound: boolean;
  onRematch: () => void;
  onHome: () => void;
}

const STATUS_LABEL = { correct: '✓', wrong: '✗', passed: '–', pending: '–' } as const;

export default function FinalScreen({ game, onRematch, onHome }: Props) {
  const multi = game.players.length > 1;
  const win = winners(game);
  const rematchRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    sfx.fanfare();
    // Foco para teclado/control remoto sin bajar la pantalla (el ganador queda a la vista).
    rematchRef.current?.focus({ preventScroll: true });
  }, []);

  const title = !multi
    ? `${scoreOf(game.players[0]).correct} de ${game.players[0].slots.length}`
    : win.length > 1
      ? '¡Empate!'
      : `¡Ganó ${game.players[win[0]].name}!`;
  const fullRosco = game.players.some((p) => p.slots.length > 0 && p.slots.every((s) => s.status === 'correct'));

  return (
    <main className="final" data-testid="final">
      <div className="final-head">
        <p className="overlay-kicker">{multi ? 'Resultado' : 'Aciertos'}</p>
        <h2 className="final-title" data-testid="winner">
          {title}
        </h2>
        {fullRosco && <p className="bote">🎉 ¡ROSCO COMPLETO! 🎉</p>}
        {multi && win.length > 1 && <p className="hint">{win.map((i) => game.players[i].name).join(' y ')} empatan.</p>}
      </div>

      <div className={`final-players n${game.players.length}`}>
        {game.players.map((p, i) => {
          const s = scoreOf(p);
          return (
            <section key={i} className={`final-card p${i} ${multi && win.includes(i) ? 'winner' : ''}`} data-testid={`result-${i}`}>
              <header>
                <h3>
                  {multi && win.includes(i) && '🏆 '}
                  {p.name}
                </h3>
                <div className="stats">
                  <span className="st ok" data-testid={`result-correct-${i}`}>
                    {s.correct} <small>aciertos</small>
                  </span>
                  <span className="st ko">
                    {s.wrong} <small>errores</small>
                  </span>
                  <span className="st na">
                    {s.unanswered} <small>sin responder</small>
                  </span>
                </div>
              </header>
              <Rosco slots={p.slots} showCurrent={false} className="rosco-mini" />
              <details className="answers" open={!multi}>
                <summary>Ver respuestas</summary>
                <ol>
                  {p.slots.map((sl) => (
                    <li key={sl.letter} className={sl.status}>
                      <span className="a-status">{STATUS_LABEL[sl.status]}</span>
                      <b>{sl.letter}</b>
                      <span className="a-word">{sl.question.answer}</span>
                      <span className="a-def">
                        {prompt(sl.letter, sl.question.type)}: {sl.question.definition}
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            </section>
          );
        })}
      </div>

      <div className="setup-actions">
        <button className="btn btn-primary btn-xl" data-testid="rematch" onClick={onRematch} ref={rematchRef}>
          🔁 Revancha (preguntas nuevas)
        </button>
        <button className="btn btn-ghost" data-testid="home" onClick={onHome}>
          Volver al inicio
        </button>
      </div>
    </main>
  );
}
