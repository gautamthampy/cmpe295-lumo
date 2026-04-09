import { Suspense } from "react";

import { LessonsAnalyticsExperience } from "@/components/lessons/lesson-ui";

export default function LessonsAnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <LessonsAnalyticsExperience />
    </Suspense>
  );
}