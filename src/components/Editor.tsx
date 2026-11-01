import { useRef, useState } from 'react';
import type { Difficulty, Question, QuestionType } from '../lib/types';
import { ALL_LETTERS, LETTERS, prompt } from '../lib/letters';
import { parseQuestions, validateQuestion } from '../lib/storage';

interface Props {
  questions: Question[];
  onChange: (qs: Question[]) => void;
  onBack: () => void;
}

interface Draft {
  id?: string;
  letter: string;
  type: QuestionType;
  answer: string;
  alt: string;
  definition: string;
  difficulty: Difficulty;
}

const EMPTY: Draft = { letter: 'A', type: 'empieza', answer: '', alt: '', definition: '', difficulty: 'media' };

/** Ejemplo genérico (NO es un dato real): solo muestra el formato. */
const EXAMPLE: Draft = {
  letter: 'P',
  type: 'empieza',
  answer: 'playa',
  alt: '',
  definition: '(EJEMPLO) Lugar adonde fuimos de vacaciones el verano pasado.',
  difficulty: 'facil',
};

export default function Editor({ questions, onChange, onBack }: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    const r = validateQuestion({
      ...draft,
      alt: draft.alt.split(',').map((s) => s.trim()).filter(Boolean),
    });
    if (typeof r === 'string') return setError(r);
    setError('');
    const exists = questions.some((q) => q.id === r.id);
    onChange(exists ? questions.map((q) => (q.id === r.id ? r : q)) : [...questions, r]);
    setMsg(exists ? 'Pregunta actualizada.' : 'Pregunta agregada.');
    setDraft({ ...EMPTY, letter: draft.letter, type: draft.type, difficulty: draft.difficulty });
  };

  const edit = (q: Question) => {
    setDraft({ id: q.id, letter: q.letter, type: q.type, answer: q.answer, alt: (q.alt ?? []).join(', '), definition: q.definition, difficulty: q.difficulty });
    setError('');
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = (q: Question) => {
    if (window.confirm(`¿Borrar la pregunta de la ${q.letter} (${q.answer})?`)) onChange(questions.filter((x) => x.id !== q.id));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 1, questions }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pasapalabra-mis-preguntas.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const { questions: imported, errors } = parseQuestions(JSON.parse(await file.text()));
      const ids = new Set(questions.map((q) => q.id));
      const merged = [...questions, ...imported.filter((q) => !ids.has(q.id))];
      onChange(merged);
      setMsg(`Importadas ${imported.length} preguntas.${errors.length ? ` Con problemas: ${errors.join(' · ')}` : ''}`);
    } catch {
      setMsg('No se pudo leer el archivo (¿es un JSON válido?).');
    }
  };

  const byLetter = [...questions].sort((a, b) => ALL_LETTERS.indexOf(a.letter as never) - ALL_LETTERS.indexOf(b.letter as never));
  const covered = new Set(questions.map((q) => q.letter));

  return (
    <main className="editor" data-testid="editor">
      <header className="editor-head">
        <button className="btn btn-ghost" onClick={onBack} data-testid="editor-back">
          ← Volver
        </button>
        <h2>Mis preguntas</h2>
        <span className="hint">Se guardan en este navegador.</span>
      </header>

      <div className="editor-grid">
        <form
          className="editor-form setup-card"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <h3>{draft.id ? 'Editar pregunta' : 'Nueva pregunta'}</h3>
          <div className="row">
            <label>
              Letra
              <select value={draft.letter} onChange={(e) => set('letter', e.target.value)} data-testid="ed-letter">
                {LETTERS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label>
              Tipo
              <select value={draft.type} onChange={(e) => set('type', e.target.value as QuestionType)} data-testid="ed-type">
                <option value="empieza">Empieza con</option>
                <option value="contiene">Contiene</option>
              </select>
            </label>
            <label>
              Dificultad
              <select value={draft.difficulty} onChange={(e) => set('difficulty', e.target.value as Difficulty)}>
                <option value="facil">Fácil</option>
                <option value="media">Media</option>
                <option value="dificil">Difícil</option>
              </select>
            </label>
          </div>
          <label>
            Definición <small>(se muestra después de «{prompt(draft.letter, draft.type)}:»)</small>
            <textarea value={draft.definition} rows={3} onChange={(e) => set('definition', e.target.value)} data-testid="ed-def" />
          </label>
          <label>
            Respuesta
            <input value={draft.answer} onChange={(e) => set('answer', e.target.value)} data-testid="ed-answer" />
          </label>
          <label>
            Otras respuestas válidas <small>(opcional, separadas por coma)</small>
            <input value={draft.alt} onChange={(e) => set('alt', e.target.value)} />
          </label>
          {error && (
            <p className="error" data-testid="ed-error">
              {error}
            </p>
          )}
          {msg && <p className="ok-msg" data-testid="ed-msg">{msg}</p>}
          <div className="row">
            <button type="submit" className="btn btn-primary" data-testid="ed-save">
              {draft.id ? 'Guardar cambios' : 'Agregar'}
            </button>
            {draft.id && (
              <button type="button" className="btn btn-ghost" onClick={() => setDraft(EMPTY)}>
                Cancelar
              </button>
            )}
          </div>
          <div className="row io">
            <button type="button" className="btn btn-ghost" onClick={exportJson} disabled={!questions.length} data-testid="ed-export">
              ⬇️ Exportar JSON
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
              ⬆️ Importar JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              data-testid="ed-import"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importJson(f);
                e.target.value = '';
              }}
            />
          </div>
        </form>

        <section className="editor-list">
          <p className="coverage">
            {LETTERS.map((l) => (
              <span key={l} className={covered.has(l) ? 'has' : ''}>
                {l}
              </span>
            ))}
          </p>
          {questions.length === 0 ? (
            <div className="example" data-testid="ed-example">
              <p className="example-tag">EJEMPLO · no se guarda ni se usa en el juego</p>
              <p>
                <b>{prompt(EXAMPLE.letter, EXAMPLE.type)}:</b> {EXAMPLE.definition}
              </p>
              <p>
                Respuesta: <b>{EXAMPLE.answer}</b>
              </p>
              <p className="hint">
                Todavía no cargaste preguntas propias. Podés agregar preguntas sobre la familia, apodos, viajes… Si una letra
                no tiene pregunta propia, se usa una del banco general.
              </p>
              <button type="button" className="btn btn-ghost" onClick={() => setDraft({ ...EXAMPLE })}>
                Copiar el ejemplo al formulario
              </button>
            </div>
          ) : (
            <ul className="qlist" data-testid="ed-list">
              {byLetter.map((q) => (
                <li key={q.id}>
                  <span className="ql-letter">{q.letter}</span>
                  <div className="ql-body">
                    <small>{prompt(q.letter, q.type)}:</small> {q.definition}
                    <div>
                      → <b>{q.answer}</b>
                    </div>
                  </div>
                  <div className="ql-actions">
                    <button className="icon-btn" aria-label="Editar" onClick={() => edit(q)}>
                      ✏️
                    </button>
                    <button className="icon-btn" aria-label="Borrar" onClick={() => remove(q)}>
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
