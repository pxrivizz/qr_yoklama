import { NextResponse } from "next/server";

import { auth } from "@/auth";

function homeWithError(requestUrl: string, error: "oturum" | "yetki") {
  const url = new URL("/", requestUrl);
  url.searchParams.set("hata", error);
  return NextResponse.redirect(url);
}

export default auth((request) => {
  const session = request.auth;
  const path = request.nextUrl.pathname;

  if (!session?.user?.id) {
    return homeWithError(request.url, "oturum");
  }

  if (path.startsWith("/ogretmen") && session.user.role !== "TEACHER") {
    return homeWithError(request.url, "yetki");
  }

  if (
    (path.startsWith("/ogrenci") || path.startsWith("/tara")) &&
    session.user.role !== "STUDENT"
  ) {
    return homeWithError(request.url, "yetki");
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/panel/:path*", "/ogretmen/:path*", "/ogrenci/:path*", "/tara/:path*"],
};
