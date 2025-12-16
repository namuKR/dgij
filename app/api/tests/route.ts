import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 Client (R2)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'dgij';
const PREFIX = 'tests/';

const S3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
});

export async function GET(_request: NextRequest) {
    try {
        // 1. List objects in the "tests/" folder
        const listCommand = new ListObjectsV2Command({
            Bucket: R2_BUCKET_NAME,
            Prefix: PREFIX,
        });

        const listResult = await S3.send(listCommand);

        if (!listResult.Contents || listResult.Contents.length === 0) {
            return NextResponse.json([]);
        }

        // 2. Filter for .json files
        const jsonFiles = listResult.Contents.filter((item: any) => item.Key?.endsWith('.json'));

        // 3. Fetch content of each JSON file in parallel
        const tests = await Promise.all(jsonFiles.map(async (file: any) => {
            if (!file.Key) return null;

            try {
                const getCommand = new GetObjectCommand({
                    Bucket: R2_BUCKET_NAME,
                    Key: file.Key
                });
                const response = await S3.send(getCommand);
                const str = await response.Body?.transformToString();
                return str ? JSON.parse(str) : null;
            } catch (err) {
                console.error(`Failed to read test file ${file.Key}:`, err);
                return null;
            }
        }));

        const validTests = tests.filter(Boolean);

        // Sort by year desc, then subject, etc if needed. Client can sort too.
        return NextResponse.json(validTests);

    } catch (error) {
        console.error('Error fetching tests from R2:', error);
        return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });
        }

        const key = `${PREFIX}${body.id}.json`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: JSON.stringify(body),
            ContentType: 'application/json'
        });

        await S3.send(command);

        return NextResponse.json({ success: true, key });

    } catch (error) {
        console.error('Error saving test to R2:', error);
        return NextResponse.json({ error: 'Failed to save test' }, { status: 500 });
    }
}
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Test ID is required' }, { status: 400 });
        }

        const key = `${PREFIX}${id}.json`;

        const command = new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });

        await S3.send(command);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error deleting test from R2:', error);
        return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 });
    }
}
