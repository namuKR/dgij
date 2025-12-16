import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Convert to base64
        const base64Data = buffer.toString('base64');

        // Use Gemini 2.0 Flash (Experimental) as requested
        // Fallback to 1.5 flash if 2.0 is not available yet in the SDK alias, 
        // but typically 'gemini-2.0-flash-exp' is the model name.
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
      Analyze this image of an OMR card or a list of answers.
      Identify the question numbers and the corresponding selected answer.
      The output MUST be a valid JSON object where keys are the question numbers (as strings) and values are the answer numbers (as integers).
      Example: {"1": 3, "2": 5, "3": 1}
      If a question is not answered, skip it. 
      If there are subjective questions (written numbers), try to recognize them as well.
      Only return the JSON object, no markdown formatting.
    `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: file.type,
                },
            },
        ]);

        const response = await result.response;
        let text = response.text();

        console.log("Raw Gemini response:", text);

        // Clean up potential markdown formatting (```json ... ```)
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const answers = JSON.parse(text);

        return NextResponse.json({ answers });
    } catch (error: any) {
        console.error('Error processing OMR:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process image' },
            { status: 500 }
        );
    }
}
