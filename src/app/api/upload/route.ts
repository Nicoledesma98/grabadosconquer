import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function safeName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request){
    const formData = await req.formData();
    const file = formData.get("file");
    if(!file || !(file instanceof File)) {
        return Response.json({ error: "No file" },{status:400});
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.join(process.cwd(), "public","uploads");
    await mkdir(uploadsDir, {recursive: true});

    const filename = `${Date.now()}_${safeName(file.name)}`;
    const fullPath = path.join(uploadsDir, filename);

    await writeFile(fullPath, buffer);

    return Response.json({
        url:`/uploads/${filename}`,
        originalName: file.name,
        mimeType: file.type,
    });
}