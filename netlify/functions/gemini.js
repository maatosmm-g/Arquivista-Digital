const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
  // Só aceita POST
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: "Method Not Allowed" }) 
    };
  }

  try {
    const { action, codeSnippet, notebooks } = JSON.parse(event.body);
    
    if (!process.env.GEMINI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "GEMINI_API_KEY not configured" })
      };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    let result;
    let prompt = "";

    if (action === "analyze") {
      prompt = `Analise este código e retorne JSON com name, description, category, tags: ${codeSnippet.substring(0, 8000)}`;
      result = await model.generateContent(prompt);
    } else if (action === "reorganize") {
      prompt = `Reorganize estas categorias de forma profissional: ${JSON.stringify(notebooks)}`;
      result = await model.generateContent(prompt);
    } else {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: "Ação desconhecida" }) 
      };
    }

    const response = await result.response;
    const text = response.text();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: text })
    };
  } catch (error) {
    console.error("Gemini Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
