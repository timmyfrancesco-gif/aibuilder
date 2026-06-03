import PreviewSandbox from '@/components/PreviewSandbox'

export default function PreviewPage({ params }: { params: { id: string } }) {
  return (
    <div className="h-screen">
      <PreviewSandbox html="" projectId={params.id} />
    </div>
  )
}
