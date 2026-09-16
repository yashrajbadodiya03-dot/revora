import { createClient } from "@/lib/supabase";

export type WorkspaceData = {
  businessId: string | null;
  businessName: string;
  userEmail: string;
  plan: "demo" | "paid";
  subscriptionStatus: "active" | "inactive";
};

const emptyWorkspace: WorkspaceData = {
  businessId: null,
  businessName: "Revora",
  userEmail: "",
  plan: "demo",
  subscriptionStatus: "inactive",
};

let workspaceCache: WorkspaceData | null = null;
let workspacePromise: Promise<WorkspaceData> | null = null;

export async function loadWorkspaceData(
  forceRefresh = false,
): Promise<WorkspaceData> {
  if (!forceRefresh && workspaceCache) {
    return workspaceCache;
  }

  if (!forceRefresh && workspacePromise) {
    return workspacePromise;
  }

  workspacePromise = (async () => {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      workspaceCache = { ...emptyWorkspace };
      return workspaceCache;
    }

    const userEmail = user.email ?? "";

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        `
          business_id,
          business:businesses (
            id,
            name,
            plan,
            subscription_status
          )
        `,
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.business_id) {
      workspaceCache = {
        businessId: null,
        businessName: "Revora",
        userEmail,
        plan: "demo",
        subscriptionStatus: "inactive",
      };

      return workspaceCache;
    }

    const business = Array.isArray(profile.business)
      ? profile.business[0]
      : profile.business;

    const plan = business?.plan === "paid" ? "paid" : "demo";

    const subscriptionStatus =
      business?.subscription_status === "active"
        ? "active"
        : "inactive";

    workspaceCache = {
      businessId: profile.business_id,
      businessName: business?.name?.trim() || "Revora",
      userEmail,
      plan,
      subscriptionStatus,
    };

    return workspaceCache;
  })();

  try {
    return await workspacePromise;
  } finally {
    workspacePromise = null;
  }
}

export function refreshWorkspaceData() {
  workspaceCache = null;
  workspacePromise = null;
}