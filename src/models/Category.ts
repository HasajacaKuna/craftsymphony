import { Schema, model, models } from "mongoose";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    order: { type: Number, default: 0 }, // << KOLEJNOŚĆ
  },
  { timestamps: true }
);

CategorySchema.index({ order: 1 });

export default models.Category || model("Category", CategorySchema);
