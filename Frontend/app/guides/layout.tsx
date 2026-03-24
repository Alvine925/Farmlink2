import { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Platform Guides',
  description: 'Step-by-step guides for farmers and buyers on the Tellus platform.',
}
 
export default function GuidesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
