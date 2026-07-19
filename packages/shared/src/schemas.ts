import { z } from "zod";
import { ORDER_STATUSES } from "./orderStatus";
import { STORE_ROLES, STORE_STATUSES, USER_ROLES } from "./constants";

/**
 * Zod schemas — validate at every boundary (form input, API handlers, edge functions).
 * These describe application-level shapes; DB row types come from packages/db/types.gen.ts.
 */

export const uuid = z.string().uuid();
export const latitude = z.number().min(-90).max(90);
export const longitude = z.number().min(-180).max(180);

export const roleSchema = z.enum(USER_ROLES);
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const storeRoleSchema = z.enum(STORE_ROLES);
export const storeStatusSchema = z.enum(STORE_STATUSES);

/** Store profile edited by admin (create) or vendor (own profile). */
export const storeInputSchema = z.object({
  name: z.string().min(1).max(160),
  slug: z.string().min(1).max(80).optional().nullable(),
  phone: z.string().min(7).max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  delivery_lat: latitude.optional().nullable(),
  delivery_lng: longitude.optional().nullable(),
  delivery_radius_m: z.number().int().positive().optional().nullable(),
  is_open: z.boolean().optional(),
  delivery_fee: z.number().nonnegative().max(100000).optional(),
});

/** An email or a phone number — at least one is required to create a login. */
export const authIdentifierSchema = z
  .string()
  .min(1)
  .max(120)
  .refine(
    (v) =>
      v.includes("@")
        ? z.string().email().safeParse(v).success
        : v.replace(/[^\d]/g, "").length >= 10,
    {
      message: "Enter a valid email or phone number",
    },
  );

/** Admin invites a vendor owner and creates their store. Owner login is email or phone. */
export const inviteVendorSchema = z.object({
  ownerIdentifier: authIdentifierSchema.optional(),
  full_name: z.string().min(1).max(120),
  store: storeInputSchema,
});

/** Admin creates a rider account. Riders never self-register. */
export const inviteRiderSchema = z.object({
  identifier: authIdentifierSchema,
  full_name: z.string().min(1).max(120),
});

export const profileSchema = z.object({
  id: uuid,
  role: roleSchema,
  full_name: z.string().min(1).max(120),
  phone: z.string().min(7).max(20).optional().nullable(),
});

export const categorySchema = z.object({
  id: uuid.optional(),
  name: z.string().min(1).max(80),
  sort_order: z.number().int().nonnegative().default(0),
});

export const productInputSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional().nullable(),
  category_id: uuid,
  price: z.number().nonnegative(),
  image_path: z.string().max(512).optional().nullable(),
});

export const inventoryUpdateSchema = z.object({
  product_id: uuid,
  quantity: z.number().int().min(0),
  is_out_of_stock: z.boolean(),
});

export const cartItemSchema = z.object({
  product_id: uuid,
  quantity: z.number().int().positive(),
});

export const placeOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  address: z.string().min(5).max(500),
  delivery_lat: latitude,
  delivery_lng: longitude,
  notes: z.string().max(500).optional().nullable(),
});

export const riderLocationSchema = z.object({
  lat: latitude,
  lng: longitude,
});

export const updateOrderStatusSchema = z.object({
  order_id: uuid,
  status: orderStatusSchema,
});

export const assignRiderSchema = z.object({
  order_id: uuid,
  rider_id: uuid,
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type InventoryUpdate = z.infer<typeof inventoryUpdateSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type RiderLocationInput = z.infer<typeof riderLocationSchema>;
export type StoreInput = z.infer<typeof storeInputSchema>;
export type InviteVendorInput = z.infer<typeof inviteVendorSchema>;
export type InviteRiderInput = z.infer<typeof inviteRiderSchema>;
