// Quick test script to verify Gemini API is working
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  try {
    const apiKey = 'AIzaSyA5BxmZ3NZjjJ-5iY_v17UDsdVk1aS7z4o'; // Your API key from .env.local
    console.log('Testing Gemini API...');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Test 1: Simple hello world
    console.log('\n🔍 Test 1: Simple hello world');
    const result1 = await model.generateContent('Say hello world');
    const response1 = result1.response;
    const text1 = response1.text();
    console.log('✅ Success! Response:', text1);

    // Test 2: Skill analysis (same as API)
    console.log('\n🔍 Test 2: Skill analysis');
    const skill = 'React';
    const level = 'beginner';
    
    const prompt = `You are an expert curriculum designer. A student wants to learn "${skill}" at ${level} level.

Please analyze this skill and return a JSON response with this exact structure:
{
  "skill": "${skill}",
  "level": "${level}",
  "estimatedTime": "X hours/days",
  "prerequisites": [
    {
      "name": "Prerequisite Name",
      "description": "Why this is needed",
      "essential": true/false
    }
  ],
  "mainTopics": [
    {
      "id": 1,
      "name": "Topic Name",
      "description": "Brief description of what this covers",
      "estimatedTime": "X minutes",
      "difficulty": "easy/medium/hard",
      "hasCode": true/false
    }
  ],
  "learningPath": "Brief description of the learning journey"
}

Guidelines:
- Include 4-8 main topics that build upon each other
- Prerequisites should be realistic and essential
- Estimate time accurately based on ${level} level
- Topics should progress from basic to advanced
- Include coding topics where relevant
- Return ONLY valid JSON, no additional text`;

    console.log('🤖 Calling Gemini for skill analysis...');
    const result2 = await model.generateContent(prompt);
    const response2 = result2.response;
    const text2 = response2.text();
    
    console.log('📝 Raw response:', text2);
    
    // Try to parse JSON
    try {
      const parsed = JSON.parse(text2);
      console.log('✅ JSON parsing successful!');
      console.log('📊 Parsed data:', JSON.stringify(parsed, null, 2));
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      console.log('Raw text that failed to parse:', text2);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      status: error.status,
      statusText: error.statusText
    });
  }
}

testGemini();