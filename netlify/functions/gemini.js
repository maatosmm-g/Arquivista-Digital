exports.handler = async (event) => {
  // Função de teste - retorna sempre uma resposta de sucesso
  console.log("📢 Função foi chamada!");
  console.log("Método:", event.httpMethod);
  console.log("Headers:", JSON.stringify(event.headers));
  
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    };
  }
  
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Método não permitido. Use POST." })
    };
  }

  try {
    const body = JSON.parse(event.body);
    console.log("📦 Body recebido:", body);
    
    // Resposta de teste - retorna dados simulados
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        response: JSON.stringify({
          name: "Notebook de Teste",
          description: "Este é um teste da função Netlify",
          category: "Teste",
          tags: ["teste", "funcionou"]
        })
      })
    };
  } catch (error) {
    console.error("❌ Erro:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message })
    };
  }
};