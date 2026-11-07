// Серые заглушки, которые видны сразу, пока страница загружается
export default function PageSkeleton() {
  return (
    <main className="min-h-screen bg-[#F6F5F2] p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg bg-[#E3E1DB]" />
        <div className="h-10 w-10 rounded-xl bg-[#E3E1DB]" />
      </div>
      <div className="h-24 rounded-2xl bg-[#E3E1DB]" />
      <div className="h-24 rounded-2xl bg-[#E3E1DB]" />
      <div className="h-24 rounded-2xl bg-[#E3E1DB]" />
    </main>
  );
}
