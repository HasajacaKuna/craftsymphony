// models/Item.ts
import { Schema, model, models, Types } from "mongoose";

const ItemSchema = new Schema(
  {
    categoryId: { type: Types.ObjectId, ref: "Category", required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    rozmiarMin: { type: Number, required: true },
    rozmiarMax: { type: Number, required: true },
    // DODAJ TO ↓↓↓
    rozmiarGlowny: { type: Number, default: null }, // nieobowiązkowe
    // ↑↑↑
    cenaPLN: { type: Number, required: true },
    numerPaska: { type: Number, required: true },
    imagePath: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.Item || model("Item", ItemSchema);
