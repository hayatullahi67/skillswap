// // pages/api/ai-tutorial.ts
// import type { NextApiRequest, NextApiResponse } from "next";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   const { topic, level } = req.body;

//   if (!topic) {
//     return res.status(400).json({ error: "Missing 'topic' in request body" });
//   }

//   try {
//     const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
//     const model = genAI.getGenerativeModel({ model: "gemini-pro" });

//     const prompt = `
//       Create a ${level}-level tutorial for learning ${topic}.
//       Break it into clear, numbered steps.
//       Include explanations, short code examples if relevant, and practical tips.
//     `;

//     const result = await model.generateContent(prompt);
//     const text = result.response.text();

//     // Send plain text — your KiroClient already parses it
//     res.status(200).json({ tutorial: text });

//   } catch (error) {
//     console.error("Gemini API Error:", error);
//     res.status(500).json({ error: "Failed to generate tutorial" });
//   }
// }




import { GoogleGenerativeAI } from '@google/generative-ai';

// Removing edge runtime as it might cause issues with Gemini API
// export const runtime = 'edge';

// Generate complete tutorial structure with steps
async function generateTutorialStructure(body: any) {
  try {
    const { skill, level } = body;
    console.log('🔍 Generating tutorial for:', { skill, level });

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ No Gemini API key found');
      return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert AI tutor creating a personalized learning experience. A student wants to learn "${skill}" at ${level} level.

Create a complete tutorial structure with this EXACT JSON format:
{
  "title": "Learn [Skill Name]",
  "description": "Engaging description of what they'll learn",
  "estimatedTime": "X hours",
  "difficulty": "${level}",
  "totalSteps": 4,
  "steps": [
    {
      "id": 1,
      "title": "Step Title",
      "content": "Detailed explanation in markdown format with examples",
      "codeExample": {
        "language": "python",
        "code": "actual working code example"
      },
      "quiz": {
        "question": "Test understanding question",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": "Why this answer is correct"
      },
      "completed": false,
      "estimatedTime": "15 minutes"
    }
  ]
}

CRITICAL REQUIREMENTS:
- Create exactly 4-5 steps that build upon each other
- Each step should have rich, detailed content (200-300 words)
- Include practical code examples for coding topics
- Create meaningful quiz questions that test understanding
- Make content appropriate for ${level} level
- Use engaging, encouraging language like a personal tutor
- Return ONLY valid JSON, no markdown formatting
- Make sure all code examples are complete and runnable`;

    console.log('🤖 Generating complete tutorial...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    let tutorialData;
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      tutorialData = JSON.parse(cleanText);
      console.log('✅ Tutorial generation successful');
    } catch (parseError) {
      console.error('❌ Failed to parse tutorial response:', parseError);
      console.error('Raw response:', text);
      return Response.json({ error: 'Failed to generate tutorial', rawResponse: text }, { status: 500 });
    }

    return Response.json(tutorialData);

  } catch (error) {
    console.error('❌ Tutorial generation failed:', error);
    return Response.json(
      { error: 'Failed to generate tutorial', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Break down a topic into simpler chunks
async function breakDownTopic(body: any) {
  try {
    const { step, skill, level } = body;

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a patient AI tutor. A ${level} student is learning "${skill}" and finds this topic challenging:

**Topic:** ${step.title}
**Current Content:** ${step.content}

Please break this down into 2-3 simpler, bite-sized explanations that are easier to understand. Use:
- Simple language and analogies
- Step-by-step breakdown
- Real-world examples
- Encouraging tone

Format as markdown with clear sections. Make it feel like a caring teacher explaining to a confused student.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return Response.json({ simplifiedExplanation: text });

  } catch (error) {
    console.error('❌ Topic breakdown failed:', error);
    return Response.json(
      { error: 'Failed to break down topic', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Generate dynamic quiz for any step
async function generateDynamicQuiz(body: any) {
  try {
    const { step, skill, level } = body;

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Create a quiz question for this learning step:

**Topic:** ${step.title}
**Content:** ${step.content}
**Skill:** ${skill}
**Level:** ${level}

Return ONLY this JSON format:
{
  "question": "Clear, specific question testing understanding",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Detailed explanation of why this answer is correct"
}

Make the question practical and test real understanding, not just memorization.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    let quizData;
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      quizData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('❌ Failed to parse quiz response:', parseError);
      return Response.json({ error: 'Failed to generate quiz', rawResponse: text }, { status: 500 });
    }

    return Response.json(quizData);

  } catch (error) {
    console.error('❌ Quiz generation failed:', error);
    return Response.json(
      { error: 'Failed to generate quiz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Generate contextual quiz based on actual learning conversation
async function generateContextualQuiz(body: any) {
  try {
    const { step, skill, level, conversationContext } = body;

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an AI tutor creating a quiz question based on the ACTUAL learning conversation that just happened.

**Learning Step:** ${step.title}
**Original Content:** ${step.content}
**Skill:** ${skill}
**Level:** ${level}

**ACTUAL CONVERSATION THAT HAPPENED:**
${conversationContext}

Based on the REAL conversation above (including any questions the student asked, clarifications provided, examples discussed, and topics broken down), create a quiz question that tests their understanding of what was ACTUALLY covered in this learning session.

IMPORTANT:
- Focus on what was actually discussed in the conversation
- If the student asked specific questions, test their understanding of those topics
- If complex topics were broken down, test the simplified concepts
- If examples were given, reference those examples
- Make it relevant to their actual learning experience

Return ONLY this JSON format:
{
  "question": "Question based on the actual conversation and learning that happened",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Explanation referencing what was actually discussed in the conversation"
}

Make the question feel personal and relevant to their specific learning journey.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    let quizData;
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      quizData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('❌ Failed to parse contextual quiz response:', parseError);
      return Response.json({ error: 'Failed to generate contextual quiz', rawResponse: text }, { status: 500 });
    }

    return Response.json(quizData);

  } catch (error) {
    console.error('❌ Contextual quiz generation failed:', error);
    return Response.json(
      { error: 'Failed to generate contextual quiz', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Explain a single topic in detail
async function explainSingleTopic(body: any) {
  try {
    const { topic, skill, level, topicIndex, totalTopics } = body;

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert tutor teaching "${skill}" at ${level} level. This is topic ${topicIndex + 1} of ${totalTopics}: "${topic.name}".

Topic context: ${topic.description}
Difficulty: ${topic.difficulty}
Has coding: ${topic.hasCode}

Please provide a comprehensive explanation that includes:

1. **Clear Introduction**: Start with what this topic is and why it's important
2. **Detailed Explanation**: Break down the concept step by step
3. **Practical Examples**: Include real-world scenarios where this is used
4. **Code Examples**: If hasCode is true, provide practical, well-commented code examples
5. **Key Takeaways**: Summarize the most important points
6. **Common Mistakes**: What beginners often get wrong

Format your response in markdown with:
- Clear headings (##, ###)
- Code blocks with proper language tags
- Bullet points for lists
- **Bold** for emphasis
- Examples that are practical and relevant

Keep the tone conversational and encouraging, like a friendly tutor explaining concepts.
Make sure code examples are complete, runnable, and well-commented.
Adjust complexity based on the ${level} level.

Write a comprehensive explanation (aim for 300-500 words plus code examples).`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return Response.json({
      explanation: text,
      topicName: topic.name,
      topicIndex: topicIndex,
      totalTopics: totalTopics
    });

  } catch (error) {
    console.error('❌ Topic explanation failed:', error);
    return Response.json(
      { error: 'Failed to explain topic', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Generate final summary and encouragement
async function generateFinalSummary(body: any) {
  try {
    const { skill, level, completedSteps, totalTime } = body;

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `A student just completed learning "${skill}" at ${level} level. They finished ${completedSteps} steps in ${totalTime} minutes.

Create an encouraging, personalized summary that includes:
1. Congratulations and acknowledgment of their achievement
2. Brief recap of what they learned
3. How this knowledge can be applied
4. Suggestions for next steps or advanced topics
5. Motivational closing

Write in a warm, encouraging tone like a proud teacher. Make it personal and inspiring.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return Response.json({ summary: text });

  } catch (error) {
    console.error('❌ Summary generation failed:', error);
    return Response.json(
      { error: 'Failed to generate summary', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle follow-up questions
async function handleFollowUpQuestion(body: any) {
  try {
    const { question, currentStep } = body;

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
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
      { error: 'Failed to generate response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    console.log('📥 Received POST request to /api/ai-tutorial');
    const body = await req.json();
    console.log('📋 Request body:', JSON.stringify(body, null, 2));

    // Handle different request types
    if (body.type === 'generate-tutorial') {
      console.log('🎓 Generating complete tutorial');
      return generateTutorialStructure(body);
    }

    if (body.type === 'followup') {
      console.log('🔄 Handling followup question');
      return handleFollowUpQuestion(body);
    }

    if (body.type === 'break-down') {
      console.log('🔍 Breaking down complex topic');
      return breakDownTopic(body);
    }

    if (body.type === 'generate-quiz') {
      console.log('📝 Generating dynamic quiz');
      return generateDynamicQuiz(body);
    }

    if (body.type === 'contextual-quiz') {
      console.log('🎯 Generating contextual quiz based on conversation');
      return generateContextualQuiz(body);
    }

    if (body.type === 'final-summary') {
      console.log('🎉 Generating final summary');
      return generateFinalSummary(body);
    }

    if (body.type === 'explain-topic') {
      console.log('📚 Handling topic explanation');
      return explainSingleTopic(body);
    }

    // Default case - redirect to use new flow
    return Response.json(
      {
        error: 'Invalid request type',
        message: 'Please specify a valid request type for the AI tutorial system',
        supportedTypes: ['generate-tutorial', 'followup', 'break-down', 'contextual-quiz', 'final-summary']
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ AI tutorial generation failed:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return Response.json(
      {
        error: 'Failed to generate tutorial',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : 'Unknown'
      },
      { status: 500 }
    );
  }
}
