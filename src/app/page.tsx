'use client';

import { Suspense } from 'react';
import { ArrestCalculatorPage } from '@/components/arrest-calculator/arrest-calculator-page';
import { Skeleton } from '@/components/ui/skeleton';

// useSearchParams (for ?modify=true) needs a Suspense boundary in a static export.
export default function Home() {
  return (
    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
      <ArrestCalculatorPage />
    </Suspense>
  );
}
