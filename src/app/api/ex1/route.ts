import {
    StreamingTextResponse,
    createStreamDataTransformer
} from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { HttpResponseOutputParser } from 'langchain/output_parsers';

export const dynamic = 'force-dynamic';

// Define the model type
type Model = ChatOpenAI | ChatGoogleGenerativeAI;

export async function POST(req: Request) {
    try {
        // Extract the `messages` from the body of the request
        const { messages } = await req.json();
        const message = messages.at(-1).content;

        const prompt = PromptTemplate.fromTemplate("{message}");

        const getModel = (modelType: string): Model => {
            switch (modelType) {
                case 'openai':
                    return new ChatOpenAI({
                        apiKey: process.env.OPENAI_API_KEY!,
                        model: 'gpt-3.5-turbo',
                        temperature: 0.8,
                    });
                case 'gemini':
                    return new ChatGoogleGenerativeAI({
                        apiKey: process.env.GOOGLE_GEN_AI_API_KEY!,
                        temperature: 0.8,
                    });
                default:
                    throw new Error('Unsupported model type');
            }
        };

        const { searchParams } = new URL(req.url);
        const modelType = searchParams.get('modelType') || 'openai'; // Default to 'openai' if not provided

        // Select the appropriate model based on the query parameter (OpenAI, Google Generative AI)
        const model: Model = getModel(modelType);

        /**
         * Chat models stream message chunks rather than bytes, so this
         * output parser handles serialization and encoding.
         */
        const parser = new HttpResponseOutputParser();

        const chain = prompt.pipe(model).pipe(parser);

        // Convert the response into a friendly text-stream
        const stream = await chain.stream({ message });

        // Respond with the stream
        return new StreamingTextResponse(
            stream.pipeThrough(createStreamDataTransformer()),
        );
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        return Response.json({ error: errorMessage }, { status: 500 });
    }
}
