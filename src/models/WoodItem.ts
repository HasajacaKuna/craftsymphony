import { Schema, model, models } from "mongoose";

const WoodItemSchema = new Schema({
  descriptionPl: { type: String, required: true },
  descriptionEn: { type: String },
  pricePLN: { type: Number, required: true },
  image: { type: String, required: true }, // URL
  order: { type: Number, default: 0 },
}, { timestamps: true });

export type WoodItemDoc = {
  _id: string;
  descriptionPl: string;
  descriptionEn?: string;
  pricePLN: number;
  image: string;
  order?: number;
};

export const WoodItem = models.WoodItem || model("WoodItem", WoodItemSchema);
