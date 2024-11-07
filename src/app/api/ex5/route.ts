import {
    Message as VercelChatMessage,
    StreamingTextResponse,
    createStreamDataTransformer
} from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { formatDocumentsAsString } from 'langchain/util/document';

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
// import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";

const decodeBase64 = (base64: string): Buffer => {
    return Buffer.from(base64.split(',')[1], 'base64');
};

const createBlobFromBuffer = (fileBuffer: Buffer, fileType: string): Blob => {
    return new Blob([fileBuffer], { type: fileType });
};

// Add a function to handle different file types
const loadDocumentFromBase64 = async (base64File: string, fileType: string) => {
    const fileBuffer = decodeBase64(base64File);
    const fileBlob = createBlobFromBuffer(fileBuffer, fileType);

    switch (fileType) {
        case 'application/pdf':
            const pdfLoader = new PDFLoader(fileBlob);
            return await pdfLoader.load();
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            const docLoader = new DocxLoader(fileBlob);
            return await docLoader.load();
        // case 'text/csv':
        //     const csvLoader = new CSVLoader(fileBlob, {
        //         column: "Cabang, Kanwil",
        //       });
        //     return await csvLoader.load();
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            const pptxLoader = new PPTXLoader(fileBlob);
            return await pptxLoader.load();
        default:
            throw new Error(`Unsupported file type: ${fileType}`);
    }
};

// Basic message formatter
const formatMessage = (message: VercelChatMessage) => {
    return `${message.role}: ${message.content}`;
};

// Chat prompt template
const TEMPLATE = `Answer the user's questions based only on the following context. If the answer is not in the context, reply politely that you do not have that information available.:
==============================
Context: {context}
==============================
Current conversation: {chat_history}

user: {question}
assistant:`;

// API Route handler
export async function POST(req: Request) {
    try {
        const { messages, file, fileType } = await req.json();

        // Format the previous messages
        const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
        const currentMessageContent = messages[messages.length - 1].content;

        // Load the document from the base64-encoded file
        const docs = await loadDocumentFromBase64(file, fileType);

        // Prepare the prompt
        const prompt = PromptTemplate.fromTemplate(TEMPLATE);

        // Initialize the Chat model
        const model = new ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY!,
            model: 'gpt-4o-mini',
            temperature: 1,
            streaming: true,
            verbose: true,
        });

        // Output parser for chat models
        const parser = new HttpResponseOutputParser();

        // Create a sequence chain for the model
        const chain = RunnableSequence.from([
            {
                question: (input) => input.question,
                chat_history: (input) => input.chat_history,
                context: () => formatDocumentsAsString(docs),
            },
            prompt,
            model,
            parser,
        ]);

        // Stream the response
        const stream = await chain.stream({
            chat_history: formattedPreviousMessages.join('\n'),
            question: currentMessageContent,
        });

        return new StreamingTextResponse(
            stream.pipeThrough(createStreamDataTransformer()),
        );
    } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        return Response.json({ error: errorMessage }, { status: 500 });
    }
}
