import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { question, context, currentStep } = await req.json();
    
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an AI tutor helping a student learn. The student is currently on step ${currentStep.id}: "${currentStep.title}".

Context of current lesson:
${currentStep.content}

${currentStep.codeExample ? `Code example they're learning:
\`\`\`${currentStep.codeExample.language}
${currentStep.codeExample.code}
\`\`\`` : ''}

Student's question: "${question}"

Please provide a helpful, conversational response that:
1. Directly answers their question
2. Relates to the current lesson context
3. Uses simple, beginner-friendly language
4. Includes practical examples if relevant
5. Encourages further learning
6. Keep it concise but thorough (2-4 sentences)

Respond in a friendly, encouraging tutor tone.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return Response.json({ response: text });

  } catch (error) {
    console.error('❌ AI followup generation failed:', error);
    return Response.json(
      { 
        error: 'Failed to generate response', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}