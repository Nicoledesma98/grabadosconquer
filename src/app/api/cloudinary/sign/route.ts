import { v2 as cloudinary } from "cloudinary";

export const runtime = "nodejs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST() {
    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = {
        timestamp,
        folder: "grabadosconquer/products",
    };

    const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        process.env.CLOUDINARY_API_SECRET!
    );

    return Response.json({
        timestamp,
        signature,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
        apiKey: process.env.CLOUDINARY_API_KEY!,
        folder: paramsToSign.folder,
    });
    
}