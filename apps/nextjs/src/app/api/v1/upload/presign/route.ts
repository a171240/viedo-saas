import { requireAuth } from "~/lib/api/auth";
import { apiSuccess, handleApiError } from "~/lib/api/response";
import { ApiError } from "~/lib/api/error";
import { getStorage } from "@videofly/common/storage";
import { nanoid } from "nanoid";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const { filename, contentType } = body;

    if (!filename || !contentType) {
      throw new ApiError("Missing filename or contentType", 400);
    }

    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      throw new ApiError(
        `Invalid content type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
        400
      );
    }

    // Generate unique key
    const ext = filename.split(".").pop() || "jpg";
    const key = `uploads/${user.id}/${nanoid()}.${ext}`;

    const storage = getStorage();
    const uploadUrl = await storage.getSignedUploadUrl({
      key,
      contentType,
      expiresIn: 3600, // 1 hour
    });

    const publicUrl = storage.getPublicUrl(key);

    return apiSuccess({
      uploadUrl,
      publicUrl,
      key,
      expiresIn: 3600,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
