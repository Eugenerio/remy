import { PageHeader } from '@/components/page-header';
import { NewCharacterWizard } from './wizard';

export default function NewCharacterPage() {
  return (
    <>
      <PageHeader
        eyebrow="New character"
        title="Train your influencer."
        description="Upload one clear face photo and 10–20 reference shots. Remy preprocesses and trains a LoRA in the background (~20 minutes)."
      />
      <NewCharacterWizard />
    </>
  );
}
