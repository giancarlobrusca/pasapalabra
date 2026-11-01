import { useEffect, useMemo, useState } from 'react';
import bankData from './data/bank.json';
import type { GameState, Question } from './lib/types';
import { LETTERS } from './lib/letters';
import { availability, selectQuestions, updateHistory } from './lib/select';
import { createGame } from './lib/game';
import { mulberry32 } from './lib/rng';
import { loadCustom, loadHistory, loadSettings, saveCustom, saveHistory, saveSettings } from './lib/storage';
import { setMuted } from './lib/sound';
import { DEFAULT_SETTINGS, MAX_PLAYERS, type Settings } from './settings';
import Setup from './components/Setup';
import GameScreen from './components/GameScreen';
import FinalScreen from './components/FinalScreen';
import Editor from './components/Editor';

const BANK = (bankData as { questions: Question[] }).questions;

type Screen = 'setup' | 'game' | 'final' | 'editor';

function initialSeed(): number {
  const s = new URLSearchParams(window.location.search).get('seed');
  return s && /^\d+$/.test(s) ? Number(s) : Math.floor(Math.random() * 2 ** 31);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup');
  const [settings, setSettings] = useState<Settings>(() => {
    const s = loadSettings(DEFAULT_SETTINGS);
    return { ...s, names: s.names.slice(0, MAX_PLAYERS), categories: Array.isArray(s.categories) ? s.categories : [] };
  });
  const [history, setHistory] = useState<Set<string>>(() => loadHistory());
  const [custom, setCustom] = useState<Question[]>(() => loadCustom());
  const [game, setGame] = useState<GameState | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const rng = useMemo(() => mulberry32(initialSeed()), []);

  useEffect(() => saveSettings(settings), [settings]);
  useEffect(() => setMuted(!settings.sound), [settings.sound]);

  const startGame = () => {
    const names = settings.names.map((n, i) => n.trim() || `Jugador ${i + 1}`);
    const sel = selectQuestions(BANK, custom, {
      letters: LETTERS,
      players: names.length,
      difficulty: settings.difficulty,
      custom: settings.custom,
      categories: settings.categories,
      history,
      rng,
    });
    if (sel.roscos[0].length === 0) {
      window.alert('No hay preguntas para armar el rosco. Cargá preguntas propias o elegí otra opción en «Mis preguntas».');
      return;
    }
    const nextHistory = updateHistory(history, sel);
    setHistory(nextHistory);
    saveHistory(nextHistory);
    setMissing(sel.missing);
    setGame(createGame(names, sel.roscos, settings.seconds * 1000));
    setScreen('game');
  };

  const avail = useMemo(
    () => availability(BANK, custom, settings.custom, settings.categories, history, LETTERS),
    [custom, settings.custom, settings.categories, history],
  );

  const resetHistory = () => {
    const empty = new Set<string>();
    setHistory(empty);
    saveHistory(empty);
  };

  const updateCustom = (qs: Question[]) => {
    setCustom(qs);
    saveCustom(qs);
  };

  return (
    <div className="app">
      {screen === 'setup' && (
        <Setup
          settings={settings}
          onChange={setSettings}
          onStart={startGame}
          onEditor={() => setScreen('editor')}
          customCount={custom.length}
          bankCount={BANK.length}
          available={avail}
          historyCount={history.size}
          onResetHistory={resetHistory}
        />
      )}
      {screen === 'game' && game && (
        <GameScreen
          initial={game}
          mode={settings.mode}
          sound={settings.sound}
          missing={missing}
          onToggleSound={() => setSettings((s) => ({ ...s, sound: !s.sound }))}
          onFinish={(g) => {
            setGame(g);
            setScreen('final');
          }}
          onQuit={() => setScreen('setup')}
        />
      )}
      {screen === 'final' && game && (
        <FinalScreen game={game} sound={settings.sound} onRematch={startGame} onHome={() => setScreen('setup')} />
      )}
      {screen === 'editor' && <Editor questions={custom} onChange={updateCustom} onBack={() => setScreen('setup')} />}
    </div>
  );
}
