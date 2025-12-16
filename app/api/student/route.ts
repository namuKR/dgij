
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const dynamic = 'force-dynamic';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

const S3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
});

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const key = `students/${userId}.json`;

    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });

        const response = await S3.send(command);
        const str = await response.Body?.transformToString();

        if (!str) {
            // If file exists but empty, return default structure?
            // Actually, if it doesn't exist, S3 usually throws NoSuchKey.
            return NextResponse.json({});
        }

        return NextResponse.json(JSON.parse(str));

    } catch (error: any) {
        if (error.name === 'NoSuchKey') {
            // User doesn't exist yet, return empty/default data
            return NextResponse.json({
                id: userId,
                name: '', // Will be filled by client if needed or default
                appliedTests: [],
                scores: []
            });
        }
        console.error('Error fetching student data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        if (!data.id) {
            return NextResponse.json({ error: 'Missing student ID' }, { status: 400 });
        }

        const key = `students/${data.id}.json`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: JSON.stringify(data),
            ContentType: 'application/json',
        });

        await S3.send(command);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error saving student data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
