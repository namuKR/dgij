
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { WEEKLY_SCHEDULE } from '@/lib/mockData'; // Fallback

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

const SCHEDULE_KEY = 'global_schedule.json';

export async function GET(_request: NextRequest) {
    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: SCHEDULE_KEY,
        });

        const response = await S3.send(command);
        const str = await response.Body?.transformToString();

        if (!str) {
            // Initial load fallback
            return NextResponse.json(WEEKLY_SCHEDULE);
        }

        return NextResponse.json(JSON.parse(str));

    } catch (error: any) {
        if (error.name === 'NoSuchKey') {
            // First time: return default mock data
            return NextResponse.json(WEEKLY_SCHEDULE);
        }
        console.error('Error fetching global schedule:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: SCHEDULE_KEY,
            Body: JSON.stringify(data),
            ContentType: 'application/json',
        });

        await S3.send(command);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error saving global schedule:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
