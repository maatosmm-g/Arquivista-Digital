const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { codeSnippet } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "API Key faltando" }) };
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Analise este código e retorne APENAS UM JSON válido com os campos: name, description, category, tags. Código: ${codeSnippet.substring(0, 5000)}`;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: cleaned
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};