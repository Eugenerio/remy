export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-16 prose prose-neutral">
      <h1 className="font-display text-4xl">Privacy</h1>
      <p className="text-ink-2">
        We store uploaded images and generated videos in our private Supabase Storage buckets.
        Only you can access your content via short-lived signed URLs. Deleting a character
        removes its dataset within 24 hours.
      </p>
      <p className="text-ink-2">
        Payment details are handled by Stripe; we never see full card numbers.
      </p>
    </article>
  );
}
