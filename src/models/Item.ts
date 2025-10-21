import { Schema, model, models, Types } from "mongoose";

const ItemImageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    altPl: { type: String, default: "", trim: true },
    altEn: { type: String, default: "", trim: true },
    isPrimary: { type: Boolean, default: false }, // miniatura / zdjęcie główne
    order: { type: Number, default: 0 },          // do sortowania ręcznie
  },
  { _id: false }
);

const ItemSchema = new Schema(
  {
    categoryId: { type: Types.ObjectId, ref: "Category", required: true },

    // PL
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },

    // EN
    titleEn: { type: String, default: "", trim: true },
    descriptionEn: { type: String, default: "", trim: true },

    rozmiarMin: { type: Number, required: true },
    rozmiarMax: { type: Number, required: true },
    rozmiarGlowny: { type: Number, default: null },
    rozSprz: { type: Number, default: null },
    cenaPLN: { type: Number, required: true },
    numerPaska: { type: Number, required: true },

    // ⬇️ TERAZ TABLICA ZDJĘĆ
    images: {
      type: [ItemImageSchema],
      validate: {
        validator: (arr: unknown[]) => Array.isArray(arr) && arr.length > 0,
        message: "Wymagane jest co najmniej jedno zdjęcie.",
      },
      default: [],
    },

    // (opcjonalnie) pozostaw na chwilę dla kompatybilności wstecznej – zaraz poniżej migracja
    // imagePath: { type: String, required: false, select: false },
  },
  { timestamps: true }
);

// Wygodny virtual: pierwsze (lub isPrimary) zdjęcie
ItemSchema.virtual("primaryImage").get(function () {
  const imgs = this.images || [];
  return imgs.find(i => i.isPrimary) || imgs[0] || null;
});

export default models.Item || model("Item", ItemSchema);
