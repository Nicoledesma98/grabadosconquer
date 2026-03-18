import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function uploadImageFromUrl(
  imageUrl: string,
  folder: string,
  publicId?: string
): Promise<string | null> {
  try {
    // Opciones de subida
    const options: any = {
      folder,
      overwrite: true,
      quality: "auto", // optimización automática
      fetch_format: "auto",
    };
    if (publicId) options.public_id = publicId;

    // Subir directamente desde la URL (Cloudinary puede fetch URLs)
    const result = await cloudinary.uploader.upload(imageUrl, options);
    return result.secure_url;
  } catch (error) {
    console.error("Error subiendo imagen a Cloudinary:", error);
    return null;
  }
}