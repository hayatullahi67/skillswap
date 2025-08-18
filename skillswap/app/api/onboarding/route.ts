import { GoogleGenerativeAI } from '@google/generative-ai';

// Generate personalized learning plan
async function generateLearningPlan(body: any) {
  try {
    const { skill, level, learningGoal } = body;
    console.log('🎯 Generating learning plan for:', { skill, level, learningGoal });

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ No Gemini API key found');
      return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert learning advisor creating a personalized learning plan. A student wants to learn "${skill}" at ${level} level.

${learningGoal ? `Their specific learning goal: "${learningGoal}"` : ''}

Create a comprehensive learning plan with this EXACT JSON format:
{
  "title": "Learn [Skill Name]",
  "description": "A personalized ${level}-level learning plan that addresses their goals",
  "estimatedTotalTime": "X hours",
  "topics": [
    {
      "id": 1,
      "title": "Topic Name",
      "summary": "Clear, engaging summary of what they'll learn in this topic",
      "estimatedTime": "X minutes",
      "difficulty": "easy/medium/hard",
      "prerequisites": ["Any prerequisites if needed"],
      "keyLearningOutcomes": ["What they'll be able to do after this topic"]
    }
  ]
}

CRITICAL REQUIREMENTS:
- Create exactly 4-5 topics that build upon each other logically
- Each topic should be substantial but achievable (15-30 minutes each)
- Make summaries engaging and specific to what they'll actually learn
- Consider their ${level} level when determining complexity
- If they provided a learning goal, tailor the plan to achieve that goal
- Topics should progress from foundational concepts to practical application
- Use encouraging, motivational language
- Return ONLY valid JSON, no markdown formatting
- Make time estimates realistic for ${level} learners

Focus on practical, hands-on learning that gets them building/doing things quickly.`;

    console.log('🤖 Generating personalized learning plan...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    let planData;
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      planData = JSON.parse(cleanText);
      console.log('✅ Learning plan generation successful');
    } catch (parseError) {
      console.error('❌ Failed to parse learning plan response:', parseError);
      console.error('Raw response:', text);
      return Response.json({ error: 'Failed to generate learning plan', rawResponse: text }, { status: 500 });
    }

    return Response.json(planData);

  } catch (error) {
    console.error('❌ Learning plan generation failed:', error);
    return Response.json(
      { error: 'Failed to generate learning plan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    console.log('📥 Received POST request to /api/onboarding');
    const body = await req.json();
    console.log('📋 Request body:', JSON.stringify(body, null, 2));

    return generateLearningPlan(body);

  } catch (error) {
    console.error('❌ Onboarding API failed:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return Response.json(
      {
        error: 'Failed to process onboarding request',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : 'Unknown'
      },
      { status: 500 }
    );
  }
}