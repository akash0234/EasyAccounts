import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export default function SideMenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rubick-shell">
      <Sidebar />
      <div className="relative z-10 md:ml-[250px] md:pr-6 md:py-4">
        <div className="rubick-content">
          <Header />
          <main className="rubick-page">{children}</main>
        </div>
      </div>
    </div>
  );
}
