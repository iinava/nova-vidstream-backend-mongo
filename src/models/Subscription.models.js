import mongoose, { Schema, mongo } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, //The on who is subscribing
      ref: "User",
    },

    channel: {
      type: Schema.Types.ObjectId, //The one who is getting subscribed
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
