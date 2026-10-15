# Product Photo Studio setup

The studio uses the existing `product-images` bucket and the current `products.image_url` and `products.additional_images` columns. The bucket already limits uploads to 5 MB and its policies restrict writes to administrators, so this feature does not require a database migration or a Storage policy change.

## Enable automatic background removal

1. Create an API key with remove.bg and review the provider's current pricing and usage terms.
2. In the Supabase project dashboard, open **Edge Functions → Secrets** and add a secret named `REMOVE_BG_API_KEY` with that key as its value.
3. Keep the key in Supabase only. Do not add it to `.env.local`, a `VITE_` variable, or Git.
4. Deploy the `remove-product-background` Edge Function from this project with `supabase functions deploy remove-product-background --project-ref mndwsmvfcjjrqpanzdkn`. The function verifies the Supabase JWT and checks that the signed-in user has the `admin` role before sending an image to the provider.

The admin must click **Remove Background** before the selected photo is sent to remove.bg. Product-scene composition is performed in the browser. The **Use existing transparent image** action can skip the external service when the source already contains a transparent background.

If the secret is missing, the function returns a clear setup error and does not claim that background removal succeeded.

## Use in the admin editor

1. Open **Admin → Products** and create or edit a product.
2. Click **Edit Product Photo**, choose an existing main/gallery image or upload a JPEG, PNG, WebP, or AVIF photo (up to 5 MB).
3. Remove the background or use an existing transparent image, select a podium and background, then adjust size and position.
4. Download a preview or save it as the main image or an additional gallery image.

When editing an existing product, the studio uploads the finished image first, then updates only the selected image field. If the upload or database update fails, the old product image remains in place and the new unused upload is removed when possible. For a new product, the selected studio image is queued and uploaded with the normal product save.
