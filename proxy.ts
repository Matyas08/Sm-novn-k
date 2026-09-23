import { NextRequest, NextResponse } from "next/server";

const MAINTENANCE_START = new Date(
  "2026-09-23T23:25:00+02:00"
).getTime();

const MAINTENANCE_END = new Date(
  "2026-09-24T14:00:00+02:00"
).getTime();

export default function proxy(request: NextRequest) {
  const now = Date.now();
  const pathname = request.nextUrl.pathname;

  const maintenanceActive =
    now >= MAINTENANCE_START &&
    now < MAINTENANCE_END;

  // Údržba právě probíhá
  if (maintenanceActive) {
    // Maintenance stránku necháme normálně fungovat
    if (pathname === "/maintenance") {
      return NextResponse.next();
    }

    // Ostatní stránky přepíšeme na maintenance
    const url = request.nextUrl.clone();

    url.pathname = "/maintenance";
    url.search = "";

    return NextResponse.rewrite(url);
  }

  // Mimo dobu údržby /maintenance skryjeme
  if (pathname === "/maintenance") {
    const url = request.nextUrl.clone();

    url.pathname = "/";
    url.search = "";

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|maintenance.gif).*)",
  ],
};