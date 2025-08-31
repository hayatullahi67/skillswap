import { GoogleGenerativeAI } from '@google/generative-ai';

// Analyze code for issues, improvements, and suggestions
async function analyzeCode(body: any) {
    try {
        const { code, language, context } = body;
        console.log('🔍 Analyzing code:', { language, codeLength: code.length });

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are an expert code reviewer and mentor. Analyze this ${language} code and provide helpful feedback.

**Code to analyze:**
\`\`\`${language}
${code}
\`\`\`

**Context:** ${context || 'General code review'}

Please provide analysis in this JSON format:
{
  "overall": "Brief overall assessment (1-2 sentences)",
  "suggestions": [
    {
      "type": "improvement|bug|style|performance|security",
      "line": 5,
      "message": "Specific suggestion",
      "severity": "high|medium|low",
      "example": "Code example if helpful"
    }
  ],
  "strengths": ["What's good about this code"],
  "learningPoints": ["Educational insights for the developer"]
}

Focus on:
- Potential bugs or errors
- Code quality improvements
- Best practices
- Performance optimizations
- Security considerations
- Learning opportunities

Be encouraging and educational, like a helpful mentor.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        let analysisData;
        try {
            let cleanText = text.trim();
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            analysisData = JSON.parse(cleanText);
            console.log('✅ Code analysis completed');
        } catch (parseError) {
            console.error('❌ Failed to parse analysis response:', parseError);
            return Response.json({ error: 'Failed to analyze code', rawResponse: text }, { status: 500 });
        }

        return Response.json(analysisData);

    } catch (error) {
        console.error('❌ Code analysis failed:', error);
        return Response.json(
            { error: 'Failed to analyze code', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Suggest specific improvements for code
async function suggestImprovements(body: any) {
    try {
        const { code, language, focusArea } = body;
        console.log('💡 Suggesting improvements:', { language, focusArea });

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a coding mentor helping improve this ${language} code. Focus on: ${focusArea || 'general improvements'}.

**Current Code:**
\`\`\`${language}
${code}
\`\`\`

Provide 2-3 specific, actionable improvements with before/after examples.

Return JSON format:
{
  "improvements": [
    {
      "title": "Improvement title",
      "description": "Why this improvement helps",
      "before": "current code snippet",
      "after": "improved code snippet",
      "explanation": "Step-by-step explanation of the change"
    }
  ],
  "nextSteps": ["What to learn next", "Additional resources"]
}

Make suggestions practical and educational. Show complete, working code examples.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        let improvementData;
        try {
            let cleanText = text.trim();
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            improvementData = JSON.parse(cleanText);
            console.log('✅ Improvements suggested');
        } catch (parseError) {
            console.error('❌ Failed to parse improvement response:', parseError);
            return Response.json({ error: 'Failed to suggest improvements', rawResponse: text }, { status: 500 });
        }

        return Response.json(improvementData);

    } catch (error) {
        console.error('❌ Improvement suggestion failed:', error);
        return Response.json(
            { error: 'Failed to suggest improvements', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Explain specific code sections
async function explainCode(body: any) {
    try {
        const { code, language, selectedLine, question } = body;
        console.log('📚 Explaining code:', { language, selectedLine, hasQuestion: !!question });

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a patient coding tutor. Explain this ${language} code in simple terms.

**Code:**
\`\`\`${language}
${code}
\`\`\`

${selectedLine ? `**Focus on line ${selectedLine}**` : ''}
${question ? `**Student's question:** ${question}` : ''}

Provide a clear, beginner-friendly explanation that covers:
1. What this code does (high-level purpose)
2. How it works (step-by-step breakdown)
3. Key concepts used
4. Why it's written this way
5. Common variations or alternatives

Use simple language, analogies where helpful, and be encouraging. 
Format as markdown with clear sections and code highlights.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        return Response.json({ explanation: text });

    } catch (error) {
        console.error('❌ Code explanation failed:', error);
        return Response.json(
            { error: 'Failed to explain code', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Generate code examples based on description
async function generateExample(body: any) {
    try {
        const { description, language, difficulty, includeComments } = body;
        console.log('🔨 Generating code example:', { language, difficulty, description });

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Generate a ${difficulty || 'beginner'}-level ${language} code example for: "${description}"

Requirements:
- Complete, working code
- ${includeComments ? 'Include detailed comments explaining each part' : 'Minimal comments'}
- Follow best practices for ${language}
- Make it educational and practical
- Include error handling where appropriate

Return JSON format:
{
  "code": "complete working code",
  "explanation": "Brief explanation of what the code does",
  "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"],
  "runInstructions": "How to run or test this code",
  "variations": ["Alternative approach 1", "Alternative approach 2"]
}

Make the code clean, readable, and suitable for learning.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        let exampleData;
        try {
            let cleanText = text.trim();
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            exampleData = JSON.parse(cleanText);
            console.log('✅ Code example generated');
        } catch (parseError) {
            console.error('❌ Failed to parse example response:', parseError);
            return Response.json({ error: 'Failed to generate example', rawResponse: text }, { status: 500 });
        }

        return Response.json(exampleData);

    } catch (error) {
        console.error('❌ Code example generation failed:', error);
        return Response.json(
            { error: 'Failed to generate example', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Generate custom code based on user request
async function generateCustomCode(body: any) {
    try {
        const { request, language, skill, currentCode, context } = body;
        console.log('🔨 Generating custom code:', { language, request });

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are an expert ${language} developer. Generate code based on this request: "${request}"

**Context:**
- Programming language: ${language}
- Learning skill: ${skill}
- Current code context: ${currentCode ? 'User has existing code' : 'Starting fresh'}
- Session context: ${context}

**User's Request:** "${request}"

Generate complete, working ${language} code that fulfills this request.

Return JSON format:
{
  "code": "complete working code with proper syntax",
  "explanation": "Clear explanation of what the code does",
  "keyFeatures": ["Feature 1", "Feature 2", "Feature 3"],
  "title": "Brief title for the generated code",
  "comments": "Additional helpful comments or notes"
}

Requirements:
- Write clean, readable, well-structured code
- Follow ${language} best practices and conventions
- Include appropriate error handling
- Make it educational and easy to understand
- Ensure the code is complete and functional
- Add helpful inline comments where needed

Examples of what to generate:
- "write a hello world flutter code" → Complete Flutter app with main.dart
- "create a function to calculate tax" → Function with parameters and return value
- "build a login form" → Complete form with validation
- "make a class for user management" → Class with methods and properties`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        let codeData;
        try {
            let cleanText = text.trim();
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            codeData = JSON.parse(cleanText);
            console.log('✅ Custom code generated');
        } catch (parseError) {
            console.error('❌ Failed to parse code response:', parseError);
            return Response.json({ error: 'Failed to generate code', rawResponse: text }, { status: 500 });
        }

        return Response.json(codeData);

    } catch (error) {
        console.error('❌ Custom code generation failed:', error);
        return Response.json(
            { error: 'Failed to generate custom code', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Handle direct chat questions from users
async function chatResponse(body: any) {
    try {
        const { question, skill, language, context } = body;
        console.log('💬 Handling chat question:', { question, skill, language });

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are an expert coding mentor in a collaborative coding session. A student learning ${skill} (${language}) has asked you a question.

**Student's Question:** "${question}"

**Session Context:** 
- Learning skill: ${skill}
- Programming language: ${language}
- Context: ${context || 'collaborative coding session'}

Provide a helpful, accurate, and educational response. Be:
- Direct and to the point
- Encouraging and supportive
- Technically accurate
- Appropriate for someone learning ${skill}
- Include practical examples when relevant
- Use simple language but don't oversimplify

If the question is about:
- **What is [technology]?** - Give a clear definition, key features, and why it's useful
- **How to [do something]?** - Provide step-by-step guidance with examples
- **Why [concept]?** - Explain the reasoning and benefits
- **Debugging help** - Offer troubleshooting steps
- **Best practices** - Share industry standards and tips

Keep your response concise but comprehensive. Format with markdown for readability.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        console.log('✅ Chat response generated');
        return Response.json({ response: text });

    } catch (error) {
        console.error('❌ Chat response failed:', error);
        return Response.json(
            { error: 'Failed to generate chat response', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Find and explain bugs in code
async function findBugs(body: any) {
    try {
        const { code, language, context } = body;
        console.log('🐛 Finding bugs in code:', { language, codeLength: code.length });

        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a debugging expert. Carefully analyze this ${language} code for bugs, errors, and potential issues.

**Code to debug:**
\`\`\`${language}
${code}
\`\`\`

**Context:** ${context || 'General debugging'}

Find and report bugs in this JSON format:
{
  "bugs": [
    {
      "type": "syntax|logic|runtime|performance|security",
      "severity": "critical|high|medium|low",
      "line": 5,
      "description": "Clear description of the bug",
      "impact": "What happens because of this bug",
      "fix": "How to fix it",
      "fixedCode": "corrected code snippet"
    }
  ],
  "potentialIssues": [
    {
      "type": "edge_case|performance|maintainability",
      "description": "Potential issue description",
      "suggestion": "How to address it"
    }
  ],
  "summary": "Overall assessment of code quality and bug severity"
}

Look for:
- Syntax errors
- Logic errors
- Null/undefined references
- Type mismatches
- Infinite loops
- Memory leaks
- Security vulnerabilities
- Edge cases not handled

Be thorough but also educational - explain why each issue is a problem.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        let bugData;
        try {
            let cleanText = text.trim();
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            bugData = JSON.parse(cleanText);
            console.log('✅ Bug analysis completed');
        } catch (parseError) {
            console.error('❌ Failed to parse bug response:', parseError);
            return Response.json({ error: 'Failed to find bugs', rawResponse: text }, { status: 500 });
        }

        return Response.json(bugData);

    } catch (error) {
        console.error('❌ Bug finding failed:', error);
        return Response.json(
            { error: 'Failed to find bugs', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// Main POST handler
export async function POST(req: Request) {
    try {
        console.log('📥 Received POST request to /api/ai-coding');
        const body = await req.json();
        console.log('📋 Request body type:', body.type);

        // Handle different request types
        switch (body.type) {
            case 'analyzeCode':
                console.log('🔍 Analyzing code');
                return analyzeCode(body);

            case 'suggestImprovements':
                console.log('💡 Suggesting improvements');
                return suggestImprovements(body);

            case 'explainCode':
                console.log('📚 Explaining code');
                return explainCode(body);

            case 'generateExample':
                console.log('🔨 Generating code example');
                return generateExample(body);

            case 'findBugs':
                console.log('🐛 Finding bugs');
                return findBugs(body);

            case 'chatResponse':
                console.log('💬 Handling chat question');
                return chatResponse(body);

            case 'generateCode':
                console.log('🔨 Generating custom code');
                return generateCustomCode(body);

            default:
                return Response.json(
                    {
                        error: 'Invalid request type',
                        message: 'Please specify a valid request type for the AI coding system',
                        supportedTypes: ['analyzeCode', 'suggestImprovements', 'explainCode', 'generateExample', 'generateCode', 'findBugs', 'chatResponse']
                    },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('❌ AI coding request failed:', error);
        return Response.json(
            {
                error: 'Failed to process coding request',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}