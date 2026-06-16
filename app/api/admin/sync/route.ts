import { NextRequest, NextResponse } from "next/server";
import { syncOrderStatuses, syncStockAndPrices } from "@/lib/sync";

export async function POST(request: NextRequest) {
  const { type } = await request.json().catch(() => ({ type: undefined }));

  try {
    if (type === "stock") {
      await syncStockAndPrices();
    } else if (type === "orders") {
      await syncOrderStatuses();
    } else {
      return NextResponse.json({ error: "type must be 'stock' or 'orders'" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
