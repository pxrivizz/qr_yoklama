import { signOut } from "@/auth";
import { TeacherShell } from "@/components/layout/teacher-shell";

type TeacherLayoutProps = {
  userName: string;
  userImage?: string | null;
  pageTitle: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  children: React.ReactNode;
};

export function TeacherLayout({
  userName,
  userImage,
  pageTitle,
  showSearch,
  searchPlaceholder,
  children,
}: TeacherLayoutProps) {
  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <TeacherShell
      userName={userName}
      userImage={userImage}
      pageTitle={pageTitle}
      showSearch={showSearch}
      searchPlaceholder={searchPlaceholder}
      onSignOut={handleSignOut}
    >
      {children}
    </TeacherShell>
  );
}
