import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify session cookie
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  // 1. Direct FormData upload (Local dev fallback when Blob token is unconfigured or dummy)
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Check mime type (png/jpg only)
      if (
        !CONFIG.IMAGE.ALLOWED_MIME_TYPES.includes(
          file.type as (typeof CONFIG.IMAGE.ALLOWED_MIME_TYPES)[number]
        )
      ) {
        return NextResponse.json(
          { error: "Invalid format. Only PNG and JPG images are accepted." },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Save locally to public/uploads
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });

      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
      const filePath = path.join(uploadDir, safeName);
      await fs.writeFile(filePath, buffer);

      const localUrl = `/uploads/${safeName}`;

      return NextResponse.json({
        url: localUrl,
        pathname: safeName,
        contentType: file.type,
        size: file.size,
      });
    } catch (err: unknown) {
      console.error("Local file upload error:", err);
      return NextResponse.json(
        { error: (err as Error).message || "Upload failed" },
        { status: 500 }
      );
    }
  }

  // 2. Vercel Blob client upload token generation
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const isDummyToken = !blobToken || blobToken.includes("dummy") || blobToken.includes("sample");

  if (isDummyToken) {
    return NextResponse.json(
      {
        error:
          "Vercel Blob token is not configured for production. Please use direct upload or configure BLOB_READ_WRITE_TOKEN in .env.local",
      },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ["image/jpeg", "image/png"],
          maximumSizeInBytes: CONFIG.IMAGE.MAX_FILE_SIZE_BYTES,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async () => {
        // Post-upload hook if needed
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to generate Blob upload token" },
      { status: 400 }
    );
  }
}

