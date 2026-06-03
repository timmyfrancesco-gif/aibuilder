export default function SitePage({ params }: { params: { slug: string } }) {
  return (
    <div className="h-screen flex items-center justify-center bg-neutral-950 text-neutral-400">
      <p>Sito: {params.slug} — Connetti Supabase per caricare il sito pubblicato.</p>
    </div>
  )
}
