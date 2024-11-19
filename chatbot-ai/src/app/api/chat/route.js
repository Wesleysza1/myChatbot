// app/api/chat/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  console.log("Recebendo requisição POST...");
  try {
    // Log da requisição recebida
    const body = await req.json();
    console.log("Corpo da requisição:", body);

    const { message } = body;

    // Verificando se a chave da API está configurada
    if (!process.env.GEMINI_API_KEY) {
      console.error("Chave GEMINI_API_KEY não encontrada nas variáveis de ambiente.");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Log da criação do modelo
    console.log("Configurando modelo Gemini...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Modelo configurado com sucesso.");

    // Enviando o prompt e logando o resultado
    console.log("Enviando mensagem ao modelo:", message);
    const result = await model.generateContent(message);
    console.log("Resposta do modelo:", result);

    // Verificando se há resposta válida
    if (!result.response || !result.response.text()) {
      console.error("Nenhuma resposta válida recebida do modelo.");
      return new Response(JSON.stringify({ error: "Invalid response from AI model" }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }

    const response = result.response.text();
    console.log("Resposta processada com sucesso:", response);

    return new Response(JSON.stringify({ response }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Log detalhado do erro
    console.error("Erro na API de chat:", error);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
}