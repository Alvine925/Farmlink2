import { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read the terms and conditions for using the Tellus platform.',
}
 
export default function TermsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
