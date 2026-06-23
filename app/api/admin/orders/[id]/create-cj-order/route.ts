import { NextRequest, NextResponse } from "next/server";
import { placeCJOrder } from "@/lib/cj-order";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await placeCJOrder(params.id);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CJ order creation failed" },
      { status: 502 }
    );
  }
}
