'use client';
import { useRef, useState } from 'react';
import type { CategorySortActivity, ActivityResult } from '@/lib/types';

interface Props {
  activity: CategorySortActivity;
  onResult: (r: ActivityResult) => void;
}

export default function CategorySortActivity({ activity, onResult }: Props) {
  const { categories, prompt } = activity.data;
  const allItems = categories.flatMap((c) => c.items).sort(() => Math.random() - 0.5);
  const [unsorted] = useState<string[]>(allItems);
  const [placements, setPlacements] = useState<Record<string, string>>({}); // item -> categoryName
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const startRef = useRef(Date.now());

  // Build a lookup: item -> correct category
  const correctMap: Record<string, string> = {};
  categories.forEach((cat) => cat.items.forEach((item) => { correctMap[item] = cat.name; }));

  function handleItemClick(item: string) {
    if (submitted) return;
    setSelectedItem(item === selectedItem ? null : item);
  }

  function handleCategoryClick(catName: string) {
    if (!selectedItem || submitted) return;
    setPlacements((prev) => ({ ...prev, [selectedItem]: catName }));
    setSelectedItem(null);
  }

  const allPlaced = unsorted.every((item) => item in placements);

  function handleSubmit() {
    if (!allPlaced || submitted) return;
    const isCorrect = Object.entries(placements).every(([item, cat]) => correctMap[item] === cat);
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

  const placedItems = new Set(Object.keys(placements));

  return (
    <div className="glass rounded-2xl p-6 my-4" role="group" aria-labelledby={`cat-instruction-${activity.id}`}>
      <p id={`cat-instruction-${activity.id}`} className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
        {activity.instruction}
      </p>
      {prompt && <p className="text-sm text-slate-600 mb-3">{prompt}</p>}
      <p className="text-xs text-slate-400 mb-4">Click an item, then click a category to place it.</p>

      {/* Unplaced items */}
      <div className="flex flex-wrap gap-2 mb-5 min-h-[40px] p-3 bg-white/40 rounded-xl border border-white/30">
        {unsorted.filter((i) => !placedItems.has(i)).length === 0
          ? <span className="text-xs text-slate-400 italic">All items placed!</span>
          : unsorted.filter((i) => !placedItems.has(i)).map((item) => (
            <button key={item} onClick={() => handleItemClick(item)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                selectedItem === item
                  ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                  : 'bg-white/80 border-white/40 hover:border-indigo-300 text-slate-700'
              }`}
              aria-pressed={selectedItem === item}>
              {item}
            </button>
          ))}
      </div>

      {/* Category buckets */}
      <div className={`grid gap-3 mb-4`} style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 3)}, 1fr)` }}>
        {categories.map((cat) => {
          const catItems = Object.entries(placements).filter(([, c]) => c === cat.name).map(([i]) => i);
          return (
            <div key={cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              className={`rounded-xl border-2 p-3 min-h-[80px] cursor-pointer transition-all ${
                selectedItem
                  ? 'border-indigo-300 hover:border-indigo-500 bg-indigo-50/40'
                  : 'border-slate-200 bg-white/40'
              }`}
              role="button"
              aria-label={`Category: ${cat.name}. ${selectedItem ? 'Click to place selected item here.' : ''}`}>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">{cat.name}</p>
              <div className="flex flex-wrap gap-1">
                {catItems.map((item) => {
                  const isCorrect = submitted && correctMap[item] === cat.name;
                  const isWrong = submitted && correctMap[item] !== cat.name;
                  return (
                    <span key={item} className={`px-2 py-1 rounded text-xs font-medium ${
                      submitted
                        ? isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item}{submitted && (isCorrect ? ' ✓' : ' ✗')}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!submitted && (
        <button onClick={handleSubmit} disabled={!allPlaced}
          className="btn-primary px-5 py-2 rounded-xl text-sm disabled:opacity-40">
          Check Categories
        </button>
      )}

      {submitted && correct !== null && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
          role="status" aria-live="polite">
          {correct ? 'All items sorted correctly!' : 'Some items are in the wrong category. Check the highlighted ones.'}
        </div>
      )}
    </div>
  );
}
