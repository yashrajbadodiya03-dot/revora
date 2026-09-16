import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/auth/callback";

  const isUpgradePage = pathname === "/upgrade";
  const isDemoPendingPage = pathname === "/demo-pending";
  const isOnboardingPage = pathname === "/onboarding";
  const isAdminPage = pathname.startsWith("/admin");

  // Not logged in
  if (!user && !isAuthPage) {
    return NextResponse.redirect(
      new URL("/login", request.url),
    );
  }

  // Already logged in
  if (user && isAuthPage) {
    return NextResponse.redirect(
      new URL("/", request.url),
    );
  }

  // Special customer-access pages
  if (
    user &&
    (isUpgradePage ||
      isDemoPendingPage ||
      isOnboardingPage)
  ) {
    // Onboarding will be checked below for paid users.
    if (!isOnboardingPage) {
      return response;
    }
  }

  // Admin access
  if (user && isAdminPage) {
    const isAdmin =
      user.email?.toLowerCase() ===
      "yashrajbadodiya03@gmail.com";

    if (isAdmin) {
      return response;
    }

    return NextResponse.redirect(
      new URL("/demo-pending", request.url),
    );
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        `
          business_id,
          business:businesses (
            plan,
            subscription_status,
            demo_access,
            activation_status,
            onboarding_status
          )
        `,
      )
      .eq("id", user.id)
      .maybeSingle();

    const business = Array.isArray(profile?.business)
      ? profile.business[0]
      : profile?.business;

    const isPaid =
      business?.plan === "paid" &&
      business?.subscription_status === "active";

    const hasDemoAccess =
      business?.demo_access === true;

    /*
     * PAID CUSTOMER FLOW
     *
     * Paid + onboarding incomplete
     * → /onboarding
     *
     * Paid + onboarding complete
     * → normal Revora
     */
    if (isPaid) {
      if (
        business?.activation_status === "active" &&
        business?.onboarding_status !== "complete"
      ) {
        if (!isOnboardingPage) {
          return NextResponse.redirect(
            new URL("/onboarding", request.url),
          );
        }

        return response;
      }

      return response;
    }

    /*
     * DEMO CUSTOMER FLOW
     *
     * Demo-approved users can use Revora normally.
     */
    if (hasDemoAccess) {
      return response;
    }

    /*
     * Account exists but has neither
     * demo access nor paid access.
     */
    if (!isDemoPendingPage) {
      return NextResponse.redirect(
        new URL("/demo-pending", request.url),
      );
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};