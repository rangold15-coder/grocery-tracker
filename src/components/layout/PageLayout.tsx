import TopBar from "./TopBar";

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function PageLayout({ title, children }: PageLayoutProps) {
  return (
    <>
      <TopBar title={title} />
      <main
        className="w-full mx-auto px-4 pt-16 pb-24"
        style={{ maxWidth: 430 }}
      >
        {children}
      </main>
    </>
  );
}
