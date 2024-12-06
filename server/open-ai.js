const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

async function generateProductDetailsWithOpenAI(prompt) {
  console.log('Prompting OpenAI with:', prompt);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      functions: [
        {
          name: "generateProductDetails",
          description: "Generate product details in JSON format",
          parameters: {
            type: "object",
            properties: {
              product_name: { type: "string" },
              product_category: { type: "string" },
              product_description: { type: "string" },
              emoji: { type: "string" }
            },
            required: ["product_name", "product_category", "product_description", "emoji"]
          }
        }
      ],
      function_call: { name: "generateProductDetails" }
    });

    console.log('completion:', completion);
    console.log('message:', completion.choices[0].message);

    const functionResponse = completion.choices[0].message.function_call.arguments;
    return JSON.parse(functionResponse);
  } catch (error) {
    console.error('An error occurred:', error.message);
    throw new Error('An error occurred while processing your request.');
  }
}

module.exports = { generateProductDetailsWithOpenAI };