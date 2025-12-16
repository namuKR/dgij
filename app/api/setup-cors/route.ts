import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
    try {
        const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
        const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
        const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
        const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

        if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
            return NextResponse.json({ error: 'R2 env vars missing' }, { status: 500 });
        }

        const S3 = new S3Client({
            region: 'auto',
            endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
        });

        const command = new PutBucketCorsCommand({
            Bucket: R2_BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["PUT", "POST", "GET", "HEAD", "DELETE"],
                        AllowedOrigins: ["http://localhost:3000", "https://localhost:3000", "*"], // Allow * for dev, narrow down in prod if needed
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3000
                    }
                ]
            }
        });

        await S3.send(command);

        return NextResponse.json({ success: true, message: `CORS configured for bucket ${R2_BUCKET_NAME}` });

    } catch (error) {
        console.error('Error setting CORS:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
