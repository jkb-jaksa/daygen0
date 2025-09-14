import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs"; // use Node runtime

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageBase64, mimeType } = await req.json();

    // Build contents: text-only OR text+image (for edits)
    const contents =
      imageBase64
        ? [
            { text: prompt ?? "" },
            { inlineData: { mimeType: mimeType || "image/png", data: imageBase64 } },
          ]
        : [prompt ?? ""];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents,
    });

    const parts = response?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p.inlineData);
    const txtPart = parts.find((p: any) => p.text);

    if (!imgPart?.inlineData?.data) {
      return NextResponse.json(
        { error: txtPart?.text || "No image returned" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      mimeType: imgPart.inlineData.mimeType || "image/png",
      imageBase64: imgPart.inlineData.data,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Generation failed", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
