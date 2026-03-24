import { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how Tellus collects, uses, and protects your personal information.',
}
 
export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
