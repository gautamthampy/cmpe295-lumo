'use client';
import type { InteractiveActivity, ActivityResult } from '@/lib/types';
import FillInBlankActivity from './FillInBlankActivity';
import TrueOrFalseActivity from './TrueOrFalseActivity';
import MultipleChoiceActivity from './MultipleChoiceActivity';
import DragToSortActivity from './DragToSortActivity';
import MatchPairsActivity from './MatchPairsActivity';
import CategorySortActivity from './CategorySortActivity';
import WordBankActivity from './WordBankActivity';
import NumberLineActivity from './NumberLineActivity';
import CountingGridActivity from './CountingGridActivity';
import HighlightTextActivity from './HighlightTextActivity';

interface Props {
  activity: InteractiveActivity;
  onResult: (r: ActivityResult) => void;
}

export default function InteractiveBlock({ activity, onResult }: Props) {
  switch (activity.type) {
    case 'FillInBlank':
      return <FillInBlankActivity activity={activity} onResult={onResult} />;
    case 'TrueOrFalse':
      return <TrueOrFalseActivity activity={activity} onResult={onResult} />;
    case 'MultipleChoice':
      return <MultipleChoiceActivity activity={activity} onResult={onResult} />;
    case 'DragToSort':
      return <DragToSortActivity activity={activity} onResult={onResult} />;
    case 'MatchPairs':
      return <MatchPairsActivity activity={activity} onResult={onResult} />;
    case 'CategorySort':
      return <CategorySortActivity activity={activity} onResult={onResult} />;
    case 'WordBank':
      return <WordBankActivity activity={activity} onResult={onResult} />;
    case 'NumberLine':
      return <NumberLineActivity activity={activity} onResult={onResult} />;
    case 'CountingGrid':
      return <CountingGridActivity activity={activity} onResult={onResult} />;
    case 'HighlightText':
      return <HighlightTextActivity activity={activity} onResult={onResult} />;
    default:
      return (
        <div className="glass rounded-xl p-4 my-3 border border-red-200" role="alert">
          <p className="text-sm text-red-600">Unknown activity type. Please check lesson content.</p>
        </div>
      );
  }
}
