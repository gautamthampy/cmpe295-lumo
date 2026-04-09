'use client';
import { useRef, useState } from 'react';
import type { DragToSortActivity, ActivityResult } from '@/lib/types';

interface Props {
  activity: DragToSortActivity;
  onResult: (r: ActivityResult) => void;
}

export default function DragToSortActivity({ activity, onResult }: Props) {
  const [order, setOrder] = useState<string[]>(() => [...activity.data.items]);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const dragItem = useRef<number | null>(null);
  const startRef = useRef(Date.now());

  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDrop(index: number) {
    if (dragItem.current === null || dragItem.current === index) return;
    const next = [...order];
    const [moved] = next.splice(dragItem.current, 1);
    next.splice(index, 0, moved);
    setOrder(next);
    dragItem.current = null;
  }

  // Keyboard / click-to-swap: select then select another to swap
  const [selected, setSelected] = useState<number | null>(null);

  function handleClick(index: number) {
    if (submitted) return;
    if (selected === null) {
      setSelected(index);
    } else if (selected === index) {
      setSelected(null);
    } else {
      const next = [...order];
      [next[selected], next[index]] = [next[index], next[selected]];
      setOrder(next);
      setSelected(null);
    }
  }

  function handleSubmit() {
    if (submitted) return;
    const isCorrect = order.join('|') === activity.data.correct_order.join('|');
    setSubmitted(true);
    setCorrect(isCorrect);
    onResult({
      activityId: activity.id,
      correct: isCorrect,
      attempts: 1,
      misconceptionTag: activity.misconception_tag,
      timeSpentMs: Date.now() - startRef.current,
    });
  }

  return (
    <div className="glass rounded-2xl p-6 my-4" role="group" aria-labelledby={`sort-instruction-${activity.id}`}>
      <p id={`sort-instruction-${activity.id}`} className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
        {activity.instruction}
      </p>
      {activity.data.label && (
        <p className="text-sm text-slate-600 mb-3">{activity.data.label}</p>
      )}
      <p className="text-xs text-slate-400 mb-4">
        Drag items or click two to swap them. Keyboard: Tab to select, Enter to pick/swap.
      </p>

      <ol className="space-y-2 mb-4" aria-label="Items to sort">
        {order.map((item, i) => {
          let itemCls = 'flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-grab select-none transition-all';
          if (submitted) {
            const isRight = item === activity.data.correct_order[i];
            itemCls += isRight
              ? ' bg-emerald-50 border-emerald-400 text-emerald-800'
              : ' bg-red-50 border-red-300 text-red-700';
          } else if (selected === i) {
            itemCls += ' bg-indigo-100 border-indigo-400 text-indigo-800 cursor-pointer';
          } else {
            itemCls += ' bg-white/70 border-white/40 hover:border-indigo-300 text-slate-700';
          }
          return (
            <li
              key={`${item}-${i}`}
              className={itemCls}
              draggable={!submitted}
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onClick={() => handleClick(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(i); }
              }}
              tabIndex={submitted ? -1 : 0}
              role="option"
              aria-selected={selected === i}
              aria-label={`Item ${i + 1}: ${item}${selected === i ? ', selected' : ''}`}
            >
              <span className="text-slate-400 font-mono text-sm w-5 flex-shrink-0">{i + 1}.</span>
              <span className="flex-1 font-medium">{item}</span>
              {!submitted && <span className="text-slate-300 text-xs">⠿</span>}
              {submitted && (
                <span className="text-sm font-bold">
                  {item === activity.data.correct_order[i] ? '✓' : '✗'}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {!submitted && (
        <button onClick={handleSubmit} className="btn-primary px-5 py-2 rounded-xl text-sm">
          Check Order
        </button>
      )}

      {submitted && correct !== null && (
        <div
          className={`mt-2 p-3 rounded-xl text-sm ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
          role="status"
          aria-live="polite"
        >
          {correct
            ? 'Correct! You got the right order!'
            : `Not quite. Correct order: ${activity.data.correct_order.join(' → ')}`}
        </div>
      )}
    </div>
  );
}
