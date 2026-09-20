import { LoadingState } from '@/components/ui/States';

export default function Loading() {
  return (
    <div className="ww-container max-w-3xl">
      <LoadingState label="LOADING" />
    </div>
  );
}
