import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { WoodItem } from "@/models/WoodItem";

export async function GET() {
  await dbConnect();
  const items = await WoodItem.find({}, { descriptionPl: 1, descriptionEn: 1, pricePLN: 1, image: 1, order: 1 })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  return NextResponse.json(items);
}
