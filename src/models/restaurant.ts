// __define-ocg__ varOcg
import mongoose, { InferSchemaType } from "mongoose";

const menuItemSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    default: () => new mongoose.Types.ObjectId(),
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
});

export type MenuItemType = InferSchemaType<typeof menuItemSchema>;

const restaurantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  restaurantName: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  deliveryPrice: { type: Number, required: true },
  estimatedDeliveryTime: { type: Number, required: true },
  cuisines: [{ type: String, required: true }],
  menuItems: [menuItemSchema],
  imageUrl: { type: String, required: true },
  lastUpdated: { type: Date, required: true, default: Date.now },
});

// Text index for `bestMatch` text search (restaurantName, cuisines, description if you add it)
restaurantSchema.index(
  { restaurantName: "text", cuisines: "text" /*, description: "text" */ },
  { name: "RestaurantTextIndex", default_language: "english" }
);

export type RestaurantType = InferSchemaType<typeof restaurantSchema>;

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
export default Restaurant;
