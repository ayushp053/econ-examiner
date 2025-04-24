import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const parseForm = async (req: NextApiRequest) =>
  new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    const form = new formidable.IncomingForm({ keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { fields, files } = await parseForm(req);
    const answer = fields.answer?.toString() || '';

    // --- Marking the written answer ---
    const textPrompt = `
You are an AQA A-Level Economics examiner. Mark the following student answer using AQA standards.
Split it into clear sentences and return:
- sentence
- highlight: "full", "partial", "none"
- comment

Respond ONLY with a valid JSON array. No introduction or explanation.

Student answer:
${answer}
    `.trim();

    const textResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: textPrompt }],
      temperature: 0.4,
    });

    // Safe JSON extraction
    const rawText = textResponse.choices[0].message.content || '';
    const startIdx = rawText.indexOf('[');
    const endIdx = rawText.lastIndexOf(']') + 1;
    let feedback = [];

    try {
      feedback = JSON.parse(rawText.slice(startIdx, endIdx));
    } catch (err) {
      console.error('JSON parse error (text):', err);
    }

    // --- Diagram feedback (optional) ---
    let diagramFeedback = null;
    const diagramFile = files.diagram?.[0];

    if (diagramFile) {
      const imageBuffer = fs.readFileSync(diagramFile.filepath);
      const base64Image = imageBuffer.toString('base64');

      const visionPrompt = `
You are an AQA A-Level Economics examiner.

Analyze the attached economics diagram. Identify:
- The type of diagram (e.g. AD/AS, PPC, cost curves)
- If it is correctly labelled and annotated
- If it shows a valid economic point

Give examiner-style feedback. Max 4 marks. Keep the feedback concise.
      `.trim();

      const visionResponse = await openai.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: visionPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
      });

      diagramFeedback = visionResponse.choices[0].message.content || null;
    }

    res.status(200).json({ feedback, diagramFeedback });
  } catch (err: any) {
    console.error('Error during AI marking:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
