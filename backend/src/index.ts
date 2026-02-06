import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { GoogleGenerativeAI, Content, GenerationConfig } from '@google/generative-ai';

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['POST', 'GET'],
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Initialize Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable is not set');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Health check endpoint
app.get('/health', (_req: ExpressRequest, res: ExpressResponse) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate text endpoint
app.post('/api/generate-text', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { prompt, systemInstruction, model = 'gemini-2.0-flash-exp' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const geminiModel = genAI.getGenerativeModel({
      model,
      systemInstruction,
    });

    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ text });
  } catch (error: any) {
    console.error('Generate text error:', error);
    res.status(500).json({
      error: 'Failed to generate text',
      message: error?.message || 'Unknown error',
    });
  }
});

// Generate content endpoint (for chat and structured generation)
app.post('/api/generate-content', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const {
      model = 'gemini-1.5-pro-002',
      systemInstruction,
      contents,
      generationConfig,
    } = req.body;

    if (!contents || !Array.isArray(contents)) {
      return res.status(400).json({ error: 'Contents array is required' });
    }

    const geminiModel = genAI.getGenerativeModel({
      model,
      systemInstruction,
    });

    const result = await geminiModel.generateContent({
      contents: contents as Content[],
      generationConfig: generationConfig as GenerationConfig,
    });

    const response = await result.response;
    const text = response.text();
    const candidates = response.candidates;

    res.json({
      text,
      candidates,
      usageMetadata: response.usageMetadata,
    });
  } catch (error: any) {
    console.error('Generate content error:', error);
    res.status(500).json({
      error: 'Failed to generate content',
      message: error?.message || 'Unknown error',
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ekrixi AI Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 API Key configured: ${GEMINI_API_KEY ? '✅' : '❌'}`);
});
