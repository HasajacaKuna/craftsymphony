import { Schema, model, models, Types } from "mongoose";


const ItemSchema = new Schema(
{
categoryId: { type: Types.ObjectId, ref: "Category", required: true },
title: { type: String, required: true },
description: { type: String, default: "" },
rozmiarMin: { type: Number, required: true },
rozmiarMax: { type: Number, required: true },
cenaPLN: { type: Number, required: true },
numerPaska: { type: Number, required: true },
imagePath: { type: String, required: true }, // np. "/images/belts/123.jpg"
},
{ timestamps: true }
);


export default models.Item || model("Item", ItemSchema);