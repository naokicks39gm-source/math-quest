type Props = {
  children: React.ReactNode;
};

export function QuestLayout({ children }: Props) {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-between p-4 max-w-md mx-auto border-x border-slate-200 shadow-sm relative">
      {children}
    </main>
  );
}