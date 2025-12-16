
import { R2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { filename, contentType } = await request.json();

        if (!filename || !contentType) {
            return NextResponse.json(
                { error: "Filename and content type are required" },
                { status: 400 }
            );
        }

        const signedUrl = await getSignedUrl(
            R2,
            new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: filename,
                ContentType: contentType,
            }),
            { expiresIn: 3600 }
        );

        return NextResponse.json({ url: signedUrl });
    } catch (error) {
        console.error("Error generating signed URL:", error);
        return NextResponse.json(
            { error: "Error generating signed URL" },
            { status: 500 }
        );
    }
}
