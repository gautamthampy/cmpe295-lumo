import { Suspense } from "react";

import { LessonsLibraryExperience } from "@/components/lessons/lesson-ui";

export default function LessonsPage() {
  return (
    <Suspense fallback={null}>
      <LessonsLibraryExperience />
    </Suspense>
  );
}