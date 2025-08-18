export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // The global AuthProvider and LayoutWrapper handle authentication and layout
  return <>{children}</>
}