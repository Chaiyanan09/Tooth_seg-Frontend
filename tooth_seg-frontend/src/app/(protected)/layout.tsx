import AppShell from "@/components/AppShell";
import ShellIntro from "./ShellIntro";
import ContentTransition from "./ContentTransition";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShellIntro>
      <AppShell>
        <ContentTransition>{children}</ContentTransition>
      </AppShell>
    </ShellIntro>
  );
}