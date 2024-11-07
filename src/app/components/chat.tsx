'use client'

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChat } from "ai/react";
import { useRef, useEffect, useState, ChangeEvent, FormEvent } from 'react';

export function Chat() {
    const [selectedApi, setSelectedApi] = useState<string>('ex1');
    const [modelType, setModelType] = useState<'openai' | 'gemini'>('openai'); 
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [base64File, setBase64File] = useState<string | null>(null);
    const [fileType, setFileType] = useState<string | null>(null); 

    // Convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    // Handle file input change
    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setUploadedFile(file);
            setFileType(file.type);
            const base64 = await fileToBase64(file);
            setBase64File(base64);
        }
    };

    // Update the useChat hook with dynamic API, model type, and file data
    const { messages, input, handleInputChange, handleSubmit } = useChat({
        api: `api/${selectedApi}?modelType=${modelType}`,
        body: {
            file: base64File,
            fileType: fileType
        },
        onError: (e) => {
            console.log(e);
        },
    });

    const chatParent = useRef<HTMLUListElement>(null);

    useEffect(() => {
        const domNode = chatParent.current;
        if (domNode) {
            domNode.scrollTop = domNode.scrollHeight;
        }
    }, [messages]);

    // Handle API button click
    const handleApiChange = (api: string) => {
        setSelectedApi(api);
        setUploadedFile(null);
        setBase64File(null);
        setFileType(null);
    };

    const handleModelChange = (model: 'openai' | 'gemini') => {
        setModelType(model);
    };

    // Custom submit handler for document upload when 'ex5' is selected
    const handleSubmitWithUpload = async (e: FormEvent) => {
        e.preventDefault();

        // Ensure file is converted to base64 before submitting
        if (selectedApi === 'ex5' && uploadedFile && !base64File) {
            const base64 = await fileToBase64(uploadedFile);
            setBase64File(base64);
        }

        handleSubmit(e);
    };

    // Disable submit button conditionally
    const isSubmitDisabled = (selectedApi === 'ex5' && !uploadedFile) || (selectedApi !== 'ex5' && !input.trim());

    return (
        <main className="flex flex-col w-full h-screen max-h-dvh bg-background">
            <header className="p-4 border-b w-full max-w-3xl mx-auto mt-10">
                <h1 className="text-2xl font-bold">Ai Integration Presentation</h1>
            </header>

            {/* Buttons to select API */}
            <section className="flex p-4 w-full max-w-3xl mx-auto">
                <div className="flex w-full max-w-3xl mx-auto items-center gap-2">
                    {/* <label className="mr-4">Select API:</label> */}
                    {[{route: 'ex1', label: 'Basic'}, {route: 'ex2', label: 'Chains 1'}, {route: 'ex3', label: 'Chains 2'}, {route: 'ex4', label: 'Embedded'}, {route: 'ex5', label: 'Uploaded'}].map(api => (
                        <Button
                            key={api.route}
                            onClick={() => handleApiChange(api.route)}
                            className={`p-2 ${selectedApi === api.route ? 'bg-primary text-white' : 'bg-muted text-black'}`}
                        >
                            {api.label}
                        </Button>
                    ))}
                </div>

            {/* Buttons to select model type */}
                {(selectedApi !== 'ex4' && selectedApi !== 'ex5') && (
                        <div className="flex w-full max-w-3xl mx-auto items-center gap-2 justify-end">
                            {/* <label className="mr-4">Select Model:</label> */}
                            {['openai', 'gemini'].map(model => (
                                <Button
                                    key={model}
                                    onClick={() => handleModelChange(model as 'openai' | 'gemini')}
                                    className={`p-2 ${modelType === model ? 'bg-primary text-white' : 'bg-muted text-black'}`}
                                >
                                    {model.toUpperCase()}
                                </Button>
                            ))}
                        </div>
                )}
            </section>


            <section className="container px-0 flex flex-col flex-grow gap-4 mx-auto max-w-3xl">
                <ul ref={chatParent} className="h-1 p-4 flex-grow bg-muted/50 rounded-lg overflow-y-auto flex flex-col gap-4">
                    {messages.map((m, index) => (
                        <div key={index}>
                            {m.role === 'user' ? (
                                <li key={m.id} className="flex flex-row">
                                    <div className="rounded-xl p-4 bg-background shadow-md flex">
                                        <p className="text-primary">{m.content}</p>
                                    </div>
                                </li>
                            ) : (
                                <li key={m.id} className="flex flex-row-reverse">
                                    <div className="rounded-xl p-4 bg-background shadow-md flex w-3/4">
                                        <p className="text-primary">{m.content}</p>
                                    </div>
                                </li>
                            )}
                        </div>
                    ))}
                </ul>
            </section>

            <section className="p-4 mb-10">
                <form onSubmit={handleSubmitWithUpload} className="flex flex-col w-full max-w-3xl mx-auto gap-2">
                    {selectedApi === 'ex5' && (
                        <Input type="file" onChange={handleFileChange} />
                    )}
                    <div className="flex flex-column w-full max-w-3xl mx-auto items-center gap-2">
                        <Input className="flex-1 min-h-[40px]" placeholder="Type your question here..." type="text" value={input} onChange={handleInputChange} />
                        <Button className="ml-2" type="submit" disabled={isSubmitDisabled}>
                            Submit
                        </Button>
                    </div>
                </form>
            </section>
        </main>
    );
}
