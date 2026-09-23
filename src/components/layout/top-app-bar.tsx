import { MaterialIcon } from "@/components/ui/icons";
import Image from "next/image";

type TopAppBarProps = {
  title: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  userImage?: string | null;
  onMenuToggle?: () => void;
};

export function TopAppBar({
  title,
  showSearch = false,
  searchPlaceholder = "Ara…",
  userImage,
  onMenuToggle,
}: TopAppBarProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-10 flex h-16 items-center justify-between border-b border-neutral-200/80 bg-white/80 px-4 shadow-none backdrop-blur-md lg:left-sidebar-width lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-neutral-700 transition-colors hover:bg-neutral-100 lg:hidden"
          aria-label="Menüyü aç"
        >
          <MaterialIcon name="menu" className="text-xl" />
        </button>
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {showSearch && (
          <form
            action="/ogretmen/dersler"
            method="GET"
            className="relative hidden sm:block"
          >
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-lg"
            />
            <input
              type="search"
              name="search"
              placeholder={searchPlaceholder}
              className="w-48 sm:w-64 rounded-lg border border-neutral-200 bg-neutral-50 py-1.5 pl-9 pr-4 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none transition-colors"
            />
          </form>
        )}

        <button
          type="button"
          className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          aria-label="Bildirimler"
        >
          <MaterialIcon name="notifications" className="text-lg" />
        </button>

        <div className="h-8 w-8 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 shadow-none ml-1">
          {userImage ? (
            <Image src={userImage} alt="" width={32} height={32} unoptimized className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-medium text-neutral-600">
              <MaterialIcon name="person" className="text-base" />
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
