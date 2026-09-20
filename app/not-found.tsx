import Link from 'next/link';
import { EmptyState } from '@/components/ui/States';

export default function NotFound() {
  return (
    <div className="ww-container max-w-2xl py-16">
      <EmptyState
        title="404 — OFF THE CHART."
        body="That page doesn't exist. The daily wick, however, very much does."
        action={
          <Link href="/" className="inline-block rounded-md bg-ww-text px-5 py-2.5 font-sans text-sm font-bold text-ww-bg">
            BACK TO THE ARENA
          </Link>
        }
      />
    </div>
  );
}
