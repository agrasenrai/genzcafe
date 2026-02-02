export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto bg-white overflow-hidden">
      {children}
    </div>
  );
} 