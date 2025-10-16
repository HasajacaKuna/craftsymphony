import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Item from "@/models/Item";
import Category from "@/models/Category";
import { checkAdminPassword } from "@/lib/auth";


export const dynamic = "force-dynamic";


export async function GET(req: Request) {
if (!checkAdminPassword(req)) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
await dbConnect();
const items = await Item.find().populate("categoryId", "name slug").sort({ createdAt: -1 });
return NextResponse.json(items);
}


export async function POST(req: Request) {
if (!checkAdminPassword(req)) {
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const body = await req.json();
const {
categoryId,
title,
description,
rozmiarMin,
rozmiarMax,
cenaPLN,
numerPaska,
imagePath,
} = body || {};


if (!categoryId || !title || !imagePath) {
return NextResponse.json({ error: "Brak wymaganych pól" }, { status: 400 });
}
await dbConnect();
const cat = await Category.findById(categoryId);
if (!cat) return NextResponse.json({ error: "Kategoria nie istnieje" }, { status: 400 });


const created = await Item.create({
categoryId,
title,
description: description || "",
rozmiarMin: Number(rozmiarMin),
rozmiarMax: Number(rozmiarMax),
cenaPLN: Number(cenaPLN),
numerPaska: Number(numerPaska),
imagePath,
});
return NextResponse.json(created, { status: 201 });
}