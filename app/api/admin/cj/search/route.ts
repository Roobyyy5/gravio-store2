import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cjApi } from "@/lib/cj-api";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  try {
    const data = await cjApi.getProductList({
      productName: searchParams.get("productName") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      pageNum: Number(searchParams.get("pageNum") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 50),
    });

    const pids = data.list.map((item) => item.pid);
    const existing = pids.length
      ? await prisma.product.findMany({
          where: { cjProductId: { in: pids } },
          select: { cjProductId: true },
        })
      : [];

    return NextResponse.json({ ...data, importedIds: existing.map((p) => p.cjProductId) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CJ search failed" },
      { status: 502 }
    );
  }
}
