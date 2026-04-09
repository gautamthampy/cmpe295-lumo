import { Suspense } from "react";

import { StudentCodeLogin } from "@/components/auth/student-code-login";

export default function StudentLoginPage() {
  return (
    <main className="w-full">
      <Suspense fallback={null}>
        <StudentCodeLogin />
      </Suspense>
    </main>
  );
}
