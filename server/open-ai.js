const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
const { getAcquiredTechnologies } = require('./game_logic_files/technology-logic');

const productDetailsCache = new Map();
const endGameTextCache = new Map();

const SYSTEM_PROMPT = "You are the AI game master behind a web e-commerce shipping game.";

async function generateProductDetailsWithOpenAI(businessName, name) {

  let prompt = `Use the provided information to generate a fun, memorable 
  product idea for an e-commerce business. A majority of the time you should generate
  a completely random idea, but occasionally you can reach into cultural references
  like movies, games, and shows for inspiration. Sometimes the business name can be 
  wacky words or play on words. First, decide on which product you are going to create.
  Then, think of the business name. Be sure to consider the marketability of it and 
  the usefulness of e-commerce shipping to the business.`;

  if (!businessName) {
    prompt += `The business name is ${businessName}.`;
  }

  // console.log('Prompting OpenAI with:', prompt);

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    functions: [
      {
        name: "generateProductDetails",
        description: "Generate product details in JSON format",
        parameters: {
          type: "object",
          properties: {
            suggested_business_name: { type: "string" },
            suggested_business_description: { type: "string" },
            product_name: { type: "string" },
            product_category: { type: "string" },
            product_description: { type: "string" },
            emoji: { type: "string" }
          },
          required: ["product_name", "product_category", "product_description", "emoji", 
            "suggested_business_name", "suggested_business_description"]
        }
      }
    ],
    function_call: { name: "generateProductDetails" }
  });

  const functionResponse = completion.choices[0].message.function_call.arguments;
  const parsedResponse = JSON.parse(functionResponse);
  console.log('The product details are:', parsedResponse);

  return parsedResponse;
}

async function generateEndGameTextWithOpenAI(playerId) {

  if (endGameTextCache.has(playerId)) {
    console.log('Returning cached response for playerId:', playerId);
    const cache = endGameTextCache.get(playerId);
    console.log('cache:', cache);
    return cache;
  }

  const { getPlayerInfo } = require('./game_logic_files/player-logic');
  const player = await getPlayerInfo(playerId);

  if(player.orders_shipped === 0) {
    return ['Alas, this business concept was abandoned before it could even set sail...'];
  }

  // get acquired technologies for player and format the names into a comma separated list
  const acquiredTechnologies = await getAcquiredTechnologies(playerId);
  const acquiredTechNames = acquiredTechnologies.map(tech => tech.name).join(', ');

  let prompt = `Based on the following acquired technologies and player stats, craft an array of 4 concise and 
  insightful observations about the player's gameplay style and decision-making. Analyze their 
  approach critically, especially if they faced challenges like running low on funds or having 
  a poor reputation, and frame the critique in a fun, engaging way. Relate these observations 
  to real-world business scenarios, specifically highlighting how these choices reflect the 
  behaviors of ShipStation users or potential customers. Connect each technology to ShipStation's 
  features and services, showcasing how they could optimize their business operations. Conclude 
  each observation with a practical tip or a persuasive sales pitch on how ShipStation can help 
  streamline workflows, boost efficiency, or enhance their reputation. Keep the tone sharp, 
  approachable, and tailored to resonate with e-commerce professionals. 
  Keep it to 1 or 2 sentences per observation.`;

  prompt += `Acquired technologies:  ${acquiredTechNames}.`;

  // add to the ai prompt the player's name and business name for a more personalized response
  prompt += `Business name is ${player.business_name} and operator name is (${player.name}).`;

  // add the player's final stats to the prompt
  prompt += `.\n\nPlayer stats:\n- 
    Money: $${player.final_money}\n- 
    Orders Shipped: ${player.final_orders_shipped}\n- 
    Reputation: ${player.final_reputation} out of 100\n- 
    Skill Points: ${player.points_spent}\n-
    Reason game ended: ${player.expiration_reason}`;

  // console.log('Prompting OpenAI with:', prompt);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      functions: [
        {
          name: "generateEndGameText",
          description: "Generate end game text in JSON format",
          parameters: {
            type: "object",
            properties: {
              observations: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["observations"]
          }
        }
      ],
      function_call: { name: "generateEndGameText" }
    });

    console.log('completion:', completion);
    console.log('message:', completion.choices[0].message);

    const functionResponse = completion.choices[0].message.function_call.arguments;
    const parsedResponse = JSON.parse(functionResponse);
    const observations = parsedResponse.observations;
    console.log('observations:', observations);
    
    endGameTextCache.set(playerId, observations);
    return observations;
  } catch (error) {
    console.error('An error occurred:', error.message);
    throw new Error('An error occurred while processing your request.');
  }
}

module.exports = { 
  generateProductDetailsWithOpenAI,
  generateEndGameTextWithOpenAI
};