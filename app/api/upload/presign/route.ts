import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';


export async function POST(request: NextRequest) {
    try {
        const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
        const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
        const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
        const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

        console.log('R2 Config Check:', {
            hasAccountId: !!R2_ACCOUNT_ID,
            accountIdValue: R2_ACCOUNT_ID, // helpful for debugging "undefined" string
            hasAccessKey: !!R2_ACCESS_KEY_ID,
            hasSecret: !!R2_SECRET_ACCESS_KEY,
            bucket: R2_BUCKET_NAME
        });

        // Check if R2 environment variables are missing or are literally the string "undefined"
        if (!R2_ACCOUNT_ID || R2_ACCOUNT_ID === 'undefined' ||
            !R2_ACCESS_KEY_ID || R2_ACCESS_KEY_ID === 'undefined' ||
            !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
            console.error('R2 Misconfiguration: Missing or invalid environment variables.');
            return NextResponse.json({ error: 'R2 storage not configured properly. Check server logs.' }, { status: 500 });
        }

        const S3 = new S3Client({
            region: 'auto',
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
        });

        const { filename, contentType } = await request.json();

        if (!filename || !contentType) {
            return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 });
        }

        const uniqueFilename = `${Date.now()}-${filename}`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: uniqueFilename,
            ContentType: contentType,
        });

        const putUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });

        // Construct the public URL (assuming the bucket has public access or is connected to a custom domain)
        // If using R2.dev subdomain: https://pub-<hash>.r2.dev/<key>
        // For now, we will return the key so the frontend can store it, 
        // and potentially a public URL if a custom domain is set in env, otherwise just the key.

        // We'll return the key and the putUrl.

        return NextResponse.json({
            putUrl,
            key: uniqueFilename,
            // If you have a public domain for the bucket, you can construct it here
            // publicUrl: `https://files.yourdomain.com/${uniqueFilename}` 
        });

    } catch (error) {
        console.error('Error generating presigned URL:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
