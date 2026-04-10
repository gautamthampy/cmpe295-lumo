import { Suspense } from "react";

import { LessonViewerRoute } from "@/components/lessons/lesson-ui";

export default function LessonViewerPage() {
  return (
    <Suspense fallback={null}>
      <LessonViewerRoute />
    </Suspense>
  );
}