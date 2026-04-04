export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category:
    | "ירקות ופירות"
    | "חלב וביצים"
    | "בשר ודגים"
    | "חטיפים"
    | "שתייה קלה"
    | "ניקיון ואחזקה"
    | "טיפוח אישי"
    | "רטבים וממרחים"
    | "שימורים"
    | "דגני בוקר"
    | "לחם ומאפים"
    | "קפואים"
    | "חד פעמי"
    | "אחר";
}

interface ParseReceiptRequest {
  image: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}

interface ParseReceiptResponse {
  items: ReceiptItem[];
  storeName: string;
  totalAmount: number;
  date: string;
}

const VALID_CATEGORIES = [
  "ירקות ופירות",
  "חלב וביצים",
  "בשר ודגים",
  "חטיפים",
  "שתייה קלה",
  "ניקיון ואחזקה",
  "טיפוח אישי",
  "רטבים וממרחים",
  "שימורים",
  "דגני בוקר",
  "לחם ומאפים",
  "קפואים",
  "חד פעמי",
  "אחר",
];

const PROMPT = `אתה מומחה לניתוח חשבוניות סופר ישראליות. נתח את החשבונית בתמונה וחלץ את כל המוצרים.
החזר תשובה JSON בלבד ללא טקסט נוסף, במבנה הבא:
{
  "storeName": "שם הרשת (לדוגמה: חצי חינם)",
  "date": "תאריך הקנייה בפורמט YYYY-MM-DD (אם לא קיים — תאריך היום)",
  "totalAmount": 0,
  "items": [ { "name": "שם מוצר", "quantity": 1, "unitPrice": 0, "totalPrice": 0, "category": "אחר" } ]
}
שים לב: שמות מוצרים בעברית, מחירים כמספרים (לא מחרוזות), קטגוריה חייבת להיות אחת מהרשימה הבאה בלבד:
"ירקות ופירות", "חלב וביצים", "בשר ודגים", "חטיפים", "שתייה קלה", "ניקיון ואחזקה", "טיפוח אישי", "רטבים וממרחים", "שימורים", "דגני בוקר", "לחם ומאפים", "קפואים", "חד פעמי", "אחר"`;

// Models to try in order — if one hits quota, fallback to the next
const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash-lite",
];

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "מפתח API של Gemini לא הוגדר. הוסף GEMINI_API_KEY לקובץ .env.local" },
        { status: 500 }
      );
    }

    const body: ParseReceiptRequest = await request.json();

    if (!body.image || !body.mimeType) {
      return Response.json(
        { error: "חסרים שדות חובה: image ו-mimeType" },
        { status: 400 }
      );
    }

    const validMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validMimeTypes.includes(body.mimeType)) {
      return Response.json(
        { error: "סוג קובץ לא נתמך. השתמש ב-JPEG, PNG, או WebP" },
        { status: 400 }
      );
    }

    const requestBody = JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: body.mimeType,
                data: body.image,
              },
            },
            {
              text: PROMPT,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    });

    // Try each model until one works
    let lastError = "";
    for (const model of GEMINI_MODELS) {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        }
      );

      if (geminiResponse.status === 429) {
        // Quota exceeded — try next model
        lastError = `${model} — quota exceeded`;
        continue;
      }

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.json();
        const errorMsg = errorData?.error?.message || "שגיאה בתקשורת עם Gemini";
        // If it's a quota/rate error, try next model
        if (errorMsg.includes("quota") || errorMsg.includes("rate")) {
          lastError = `${model} — ${errorMsg}`;
          continue;
        }
        return Response.json(
          { error: `שגיאה מ-Gemini: ${errorMsg}` },
          { status: geminiResponse.status }
        );
      }

      const geminiData = await geminiResponse.json();

      const rawText =
        geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!rawText) {
        return Response.json(
          { error: "לא התקבלה תשובה מהמודל" },
          { status: 500 }
        );
      }

      // Remove markdown code fences if present
      let cleanText = rawText;
      if (cleanText.startsWith("```")) {
        cleanText = cleanText
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "");
      }

      let parsed: ParseReceiptResponse;
      try {
        parsed = JSON.parse(cleanText);
      } catch {
        return Response.json(
          { error: "התשובה מהמודל אינה JSON תקין", rawResponse: cleanText },
          { status: 500 }
        );
      }

      // Validate and fix categories
      parsed.items = parsed.items.map((item) => ({
        ...item,
        category: VALID_CATEGORIES.includes(item.category)
          ? item.category
          : "אחר",
      }));

      return Response.json(parsed);
    }

    // All models exhausted
    return Response.json(
      { error: `כל מודלי Gemini החינמיים הגיעו למגבלת השימוש. נסה שוב מחר. (${lastError})` },
      { status: 429 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "שגיאה לא ידועה";
    return Response.json(
      { error: `שגיאה בעיבוד החשבונית: ${message}` },
      { status: 500 }
    );
  }
}
