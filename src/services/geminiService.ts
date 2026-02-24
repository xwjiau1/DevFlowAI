import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

export const SYSTEM_INSTRUCTION = `You are a professional AI Development Assistant specialized in project lifecycle management. 
Your goal is to help developers follow a strict 7-step development standard:

1. Requirement Confirmation (Meeting minutes, screen recordings).
2. AW Task Items (Task breakdown).
3. Overall Flowchart (Mermaid diagrams, detail-lists).
4. Development Plan & Schedule.
5. Prototype Development.
6. Progress Documentation (Goals, Non-Bucket List, Details list).
7. Output Documentation (API docs, deployment plans, process docs, code structure).

When asked to draw a flowchart or diagram, use Mermaid syntax wrapped in \`\`\`mermaid blocks.
IMPORTANT MERMAID RULES:
- Use "graph TD" or "graph LR" for flowcharts.
- Use "sequenceDiagram" for sequence diagrams.
- Use "gantt" for project schedules.
- AVOID using special characters like parentheses (), brackets [], or braces {} inside node labels unless they are wrapped in double quotes. Example: A["Task (Detail)"]
- Keep labels concise.
- Ensure all nodes are connected.
- For complex diagrams, use subgraphs to organize.

Be concise, professional, and structured. Help the user organize their thoughts and assets.
You can also help with "Daily Review" (LL: continuous review).

Always maintain context of the current project.`;

const SUPPORTED_INLINE_MIMES = [
  'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
  'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
  'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm', 'video/wmv', 'video/3gpp',
  'application/pdf'
];

export async function chatWithAI(
  projectId: string, 
  messages: { role: string, content: string }[], 
  modelConfig: { modelName: string, apiKey: string, baseUrl: string },
  documents: { id: string, title: string, content: string, type: string, extracted_text?: string }[] = [],
  isStreaming: boolean = false,
  onChunk?: (chunk: string) => void
) {
  let systemPrompt = SYSTEM_INSTRUCTION;
  
  if (documents.length > 0) {
    systemPrompt += `\n\nHere is the project documentation context to help you answer questions:\n\n`;
    documents.forEach(doc => {
      if (doc.extracted_text) {
        systemPrompt += `--- Document: ${doc.title} (ID: ${doc.id}) ---\n${doc.extracted_text.substring(0, 5000)}\n\n`;
      } else if (!doc.content.startsWith('data:')) {
        systemPrompt += `--- Document: ${doc.title} (ID: ${doc.id}) ---\n${doc.content.substring(0, 2000)}\n\n`;
      } else {
        const match = doc.content.match(/^data:([^;]+);base64,(.*)$/);
        if (match && SUPPORTED_INLINE_MIMES.includes(match[1])) {
          systemPrompt += `--- Document: ${doc.title} (ID: ${doc.id}) ---\n[File content provided as attachment]\n\n`;
        } else {
          systemPrompt += `--- Document: ${doc.title} (ID: ${doc.id}) ---\n[Binary file: ${doc.type}. Content not directly readable by AI.]\n\n`;
        }
      }
    });
    systemPrompt += `\n\nWhen you use information from these documents, please cite them at the end of your response like this:\n\nReferences:\n- [Document Title](#doc-{document_id})\n`;
  }

  const isGemini = modelConfig.baseUrl.includes('generativelanguage.googleapis.com') || modelConfig.modelName.includes('gemini');

  if (isGemini) {
    const ai = new GoogleGenAI({ apiKey: modelConfig.apiKey });
    const geminiContents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    if (documents.length > 0) {
      // Find the last user message index
      let lastUserMessageIndex = -1;
      for (let i = geminiContents.length - 1; i >= 0; i--) {
        if (geminiContents[i].role === 'user') {
          lastUserMessageIndex = i;
          break;
        }
      }
      
      if (lastUserMessageIndex !== -1) {
        const docParts: any[] = documents.map(doc => {
          if (doc.content.startsWith('data:')) {
            const match = doc.content.match(/^data:([^;]+);base64,(.*)$/);
            if (match && SUPPORTED_INLINE_MIMES.includes(match[1])) {
              return {
                inlineData: {
                  mimeType: match[1],
                  data: match[2]
                }
              };
            }
          }
          return null;
        }).filter(Boolean);
        
        geminiContents[lastUserMessageIndex].parts.push(...docParts);
      }
    }

    if (isStreaming && onChunk) {
      const stream = await ai.models.generateContentStream({
        model: modelConfig.modelName,
        contents: geminiContents,
        config: { systemInstruction: systemPrompt }
      });

      let fullResponse = "";
      let promptTokens = 0;
      let completionTokens = 0;
      for await (const chunk of stream) {
        const text = (chunk as any).text;
        if (text) {
          fullResponse += text;
          onChunk(text);
        }
        if ((chunk as any).usageMetadata) {
          promptTokens = (chunk as any).usageMetadata.promptTokenCount || 0;
          completionTokens = (chunk as any).usageMetadata.candidatesTokenCount || 0;
        }
      }
      return { text: fullResponse, usage: { promptTokens, completionTokens } };
    } else {
      const response = await ai.models.generateContent({
        model: modelConfig.modelName,
        contents: geminiContents,
        config: { systemInstruction: systemPrompt }
      });
      return { 
        text: response.text || "", 
        usage: { 
          promptTokens: response.usageMetadata?.promptTokenCount || 0, 
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0 
        } 
      };
    }
  } else {
    const openai = new OpenAI({
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.baseUrl,
      dangerouslyAllowBrowser: true
    });

    if (isStreaming && onChunk) {
      const stream = await openai.chat.completions.create({
        model: modelConfig.modelName,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map(m => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content
          }))
        ],
        stream: true,
        stream_options: { include_usage: true }
      });

      let fullResponse = "";
      let promptTokens = 0;
      let completionTokens = 0;
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          onChunk(content);
        }
        if (chunk.usage) {
          promptTokens = chunk.usage.prompt_tokens;
          completionTokens = chunk.usage.completion_tokens;
        }
      }
      return { text: fullResponse, usage: { promptTokens, completionTokens } };
    } else {
      const response = await openai.chat.completions.create({
        model: modelConfig.modelName,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map(m => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content
          }))
        ],
      });

      return { 
        text: response.choices[0].message.content || "", 
        usage: { 
          promptTokens: response.usage?.prompt_tokens || 0, 
          completionTokens: response.usage?.completion_tokens || 0 
        } 
      };
    }
  }
}
