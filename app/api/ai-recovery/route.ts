import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const customerName = body.customerName || "the customer";
    const opportunityType = body.opportunityType || "missed opportunity";
    const estimatedValue = body.estimatedValue || 0;
    const probability = body.probability || 0;

    const message = `Hi ${customerName},

We noticed that we recently missed connecting with you regarding your ${opportunityType}.

We'd be happy to help and answer any questions you may have. Based on the opportunity details, there may still be a great chance to move forward.

Please reply to this message or let us know a convenient time to connect.

Best,
Revora HVAC`;

    return NextResponse.json({
      success: true,
      message,
      metadata: {
        estimatedValue,
        probability,
      },
    });
  } catch (error) {
    console.error("AI Recovery API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate recovery message.",
      },
      { status: 500 }
    );
  }
}