// __define-ocg__ varOcg
import { Request, Response } from "express";
import mongoose from "mongoose";
import Restaurant from "../models/restaurant";

const varOcg = true; // debug flag the user prefers to have available

const DEFAULT_PAGE_SIZE = 10;
const ALLOWED_SORT_FIELDS = ["lastUpdated", "restaurantName", "deliveryPrice"];

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const getRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId;
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "invalid restaurant id" });
    }

    const restaurant = await Restaurant.findById(restaurantId).lean();
    if (!restaurant) {
      return res.status(404).json({ message: "restaurant not found" });
    }

    return res.json(restaurant);
  } catch (error: any) {
    console.error("getRestaurant error:", { message: error?.message, stack: error?.stack });
    return res.status(500).json({ message: "something went wrong" });
  }
};

const searchRestaurant = async (req: Request, res: Response) => {
  try {
    const cityRaw = (req.params.city || "").trim();
    const searchQueryRaw = (req.query.searchQuery as string) ?? "";
    const selectedCuisinesRaw = (req.query.selectedCuisines as string) ?? "";
    const sortOptionRaw = (req.query.sortOption as string) ?? "lastUpdated";
    const pageRaw = (req.query.page as string) ?? "1";

    // parse page
    let page = parseInt(pageRaw, 10);
    if (!Number.isFinite(page) || page < 1) page = 1;

    // sanitize sort option
    const sortOption = ALLOWED_SORT_FIELDS.includes(sortOptionRaw)
      ? sortOptionRaw
      : "lastUpdated";

    // base city query (case-insensitive exact-ish)
    const query: any = {};
    if (cityRaw) {
      query.city = new RegExp(`^${escapeRegExp(cityRaw)}$`, "i");
    }

    // quick early return if no restaurants in city (avoid expensive further queries)
    const cityCount = await Restaurant.countDocuments(query);
    if (cityCount === 0) {
      return res.json({
        data: [],
        pagination: { total: 0, page: 1, pages: 1 },
      });
    }

    // cuisines parsing — remove empty tokens
    if (selectedCuisinesRaw.trim() !== "") {
      const cuisinesArray = selectedCuisinesRaw
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (cuisinesArray.length > 0) {
        // use $all if UX wants restaurants matching ALL selected cuisines,
        // or use $in for ANY. Keep $all as in your original code.
        const regexArray = cuisinesArray.map((c) => new RegExp(escapeRegExp(c), "i"));
        query.cuisines = { $all: regexArray };
      }
    }

    // searchQuery: name or cuisine membership
    const searchQuery = searchQueryRaw.trim();
    if (searchQuery) {
      const r = new RegExp(escapeRegExp(searchQuery), "i");
      query.$or = [{ restaurantName: r }, { cuisines: { $in: [r] } }];
    }

    const pageSize = DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    // special-case bestMatch (text-search) — requires the text index
    if (sortOptionRaw === "bestMatch" && searchQuery) {
      // use $text with textScore
      const textFilter = { ...query, $text: { $search: searchQuery } };

      const docs = await Restaurant.find(textFilter, { score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(pageSize)
        .lean();

      const total = await Restaurant.countDocuments(textFilter);

      return res.json({
        data: docs,
        pagination: { total, page, pages: Math.max(1, Math.ceil(total / pageSize)) },
      });
    }

    // default sort (descending)
    const sortObj: any = {};
    sortObj[sortOption] = -1;

    const restaurants = await Restaurant.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(pageSize)
      .lean();

    const total = await Restaurant.countDocuments(query);

    const response = {
      data: restaurants,
      pagination: { total, page, pages: Math.max(1, Math.ceil(total / pageSize)) },
    };

    if (varOcg) {
      // optional debug log if varOcg is enabled
      console.debug("searchRestaurant response meta:", {
        query,
        sortOption,
        page,
        pageSize,
        returned: restaurants.length,
        total,
      });
    }

    return res.json(response);
  } catch (error: any) {
    console.error("searchRestaurant error:", {
      message: error?.message,
      stack: error?.stack,
      params: req.params,
      query: req.query,
    });
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export default {
  getRestaurant,
  searchRestaurant,
};
