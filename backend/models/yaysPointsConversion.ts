import { Schema } from "mongoose";
import { IDocumentModel } from "../data/base";
import { PointsConversion } from "../data/yaysConversion";

export interface PointsConversionModel
  extends IDocumentModel<PointsConversion>,
    PointsConversion {}

const pointsConversionSchema = new Schema(
  {
    userLower: { type: String, required: true, index: true },
    pointsSpent: { type: Number, required: true },
    nuggetsCredited: { type: Number, required: true },
    rate: { type: Number, required: true },
    status: {
      type: String,
      enum: ["completed", "failed"],
      default: "completed",
      index: true,
    },
    idempotencyKey: { type: String, required: true },
    pointsEntryId: { type: String, default: null },
    pointsBalanceAfter: { type: Number, required: true },
    nuggetBalanceBefore: { type: Number, required: true },
    nuggetBalanceAfter: { type: Number, required: true },
    failureReason: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One conversion per (user, key). A double-tapped Convert button or a retry
// after a dropped response resolves to the same row instead of spending the
// points twice — the same guarantee the points ledger itself makes.
pointsConversionSchema.index({ userLower: 1, idempotencyKey: 1 }, { unique: true });
// History screen: newest first for one member.
pointsConversionSchema.index({ userLower: 1, createdAt: -1 });

export default pointsConversionSchema;
