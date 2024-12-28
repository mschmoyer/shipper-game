const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
const { getAcquiredTechnologies } = require('./game_logic_files/technology-logic');

const productDetailsCache = new Map();
const endGameTextCache = new Map();

const SYSTEM_PROMPT = "You are the AI game master behind a web e-commerce shipping game.";

async function generateProductDetailsWithOpenAI(businessName, name) {

  let prompt = `Generate a memorable e-commerce business that is shipping a product. 
  Your task is to use the following seed data and a creative approach to generate this fun enterprise for your business. 
  If no seed word is generated, then draw from cultural references or real-world scenarios to craft a unique business.
  The products should be shippable and represent three unique facets of the business, similar to three different resources
  in a game like Settlers of Catan. The business name should be catchy and memorable.
  The products should be related to the business name you generate. 
  Each product description should be one short sentence and be funny.
  Each product emoji should be unique.`;

  if (businessName) {
    prompt += `The seed data is: ${businessName}.`;
  }
  if (name) {
    prompt += `The business owner is: ${name}.`;
  }

  console.log('Prompting OpenAI with:', prompt);

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
            emoji: { type: "string" },
            product_name_2: { type: "string" },
            product_category_2: { type: "string" },
            product_description_2: { type: "string" },
            emoji_2: { type: "string" },
            product_name_3: { type: "string" },
            product_category_3: { type: "string" },
            product_description_3: { type: "string" },
            emoji_3: { type: "string" }
          },
          required: ["product_name", "product_category", "product_description", "emoji", 
            "suggested_business_name", "suggested_business_description", "product_name_2", "product_category_2",
            "product_description_2", "emoji_2", "product_name_3", "product_category_3", "product_description_3", "emoji_3"]
        }
      }
    ],
    function_call: { name: "generateProductDetails" }
  });

  const functionResponse = completion.choices[0].message.function_call.arguments;
  const parsedResponse = JSON.parse(functionResponse);
  console.log('The product details are:', parsedResponse);

  return {
    suggested_business_description: parsedResponse.suggested_business_description,
    suggested_business_name: parsedResponse.suggested_business_name,
    products: [
      {
        name: parsedResponse.product_name,
        category: parsedResponse.product_category,
        description: parsedResponse.product_description,
        emoji: parsedResponse.emoji
      },
      {
        name: parsedResponse.product_name_2,
        category: parsedResponse.product_category_2,
        description: parsedResponse.product_description_2,
        emoji: parsedResponse.emoji_2
      },
      {
        name: parsedResponse.product_name_3,
        category: parsedResponse.product_category_3,
        description: parsedResponse.product_description_3,
        emoji: parsedResponse.emoji_3
      }
    ]
  };
}

async function generateEndGameTextWithOpenAI(businessId) {

  if (endGameTextCache.has(businessId)) {
    console.log('Returning cached response for businessId:', businessId);
    const cache = endGameTextCache.get(businessId);
    console.log('cache:', cache);
    return cache;
  }

  const { getBusinessInfo } = require('./game_logic_files/business-logic');
  const business = await getBusinessInfo(businessId);
  const { getActiveProducts } = require('./game_logic_files/product-logic');
  const products = await getActiveProducts(businessId);

  if(business.orders_shipped === 0) {
    return ['Alas, this business concept was abandoned before it could even set sail...'];
  }

  // get acquired technologies for business and format the names into a comma separated list
  const acquiredTechnologies = await getAcquiredTechnologies(businessId);
  const acquiredTechNames = acquiredTechnologies.map(tech => tech.name).join(', ');

  // let prompt = `Based on the following acquired technologies and business stats, craft an array of 4 concise and 
  // insightful observations about the business's gameplay style and decision-making. Analyze their 
  // approach critically, especially if they faced challenges like running low on funds or having 
  // a poor reputation, and frame the critique in a fun, engaging way. Relate these observations 
  // to real-world business scenarios, specifically highlighting how these choices reflect the 
  // behaviors of ShipStation users or potential customers. Connect each technology to ShipStation's 
  // features and services, showcasing how they could optimize their business operations. Conclude 
  // each observation with a practical tip or a persuasive sales pitch on how ShipStation can help 
  // streamline workflows, boost efficiency, or enhance their reputation. Keep the tone sharp, 
  // approachable, and tailored to resonate with e-commerce professionals. 
  // Keep it to 1 or 2 sentences per observation.`;

    // add the business's final stats to the prompt
    // prompt += `.\n\nBusiness stats:\n- 
    // Money: $${business.final_money}\n- 
    // Orders Shipped: ${business.final_orders_shipped}\n- 
    // Reputation: ${business.final_reputation} out of 100\n- 
    // Skill Points: ${business.points_spent}\n-
    // Reason game ended: ${business.expiration_reason}`;


  const celebrityCEOs = [
    "Elon Musk",       // Tesla, SpaceX, and X (Twitter) - Known for his bold vision and controversial persona.
    "Mark Zuckerberg", // Meta (Facebook) - Known for revolutionizing social media.
    "Jeff Bezos",      // Amazon - Famous for building one of the world’s largest companies and his Blue Origin ventures.
    "Richard Branson", // Virgin Group - Known for his adventurous spirit and public stunts.
    "Oprah Winfrey",   // Harpo Productions - Media mogul with a massive influence and fame beyond her CEO role.
    "Steve Jobs",      // (Late) Apple - An iconic visionary and marketing genius.
    "Sara Blakely",    // Spanx - Known for her inspiring entrepreneurial journey.
    "Jack Dorsey",     // Twitter (now X) & Square - Known for his minimalist lifestyle and innovative ideas.
    "Lady Gaga",       // Creative and expressive, with a deep focus on individuality and empowerment.
    "Ryan Reynolds",   // Witty and humorous, known for his comedic style and personal touch.
    "Beyoncé",         // Poised and powerful, with a focus on empowerment and elegance.
    "Neil deGrasse Tyson", // A mix of intellect and charisma, blending science with storytelling.
    "Keanu Reeves",    // Humble, heartfelt, and deeply thoughtful in his communication.
    "Quentin Tarantino", // Unique, dramatic, and full of vivid storytelling and sharp wit.
    "Greta Thunberg",  // Passionate, direct, and compelling, with a focus on meaningful issues.
    "Taika Waititi"    // Funny, offbeat, and highly creative, with an imaginative approach to storytelling.
  ];
  // pick a random one
  const randomCEO = celebrityCEOs[Math.floor(Math.random() * celebrityCEOs.length)];
    

  let prompt = `Write a one paragraph business analysis in the tone of ${randomCEO} critiquing the player's business.
  Make it funny and engaging. Poke fun at mistakes they may have made and shine light on anything abnormal.
  For currency always include the dollar sign. For numbers, use commas. For percentages, use the % symbol.`;

  prompt += `The business name was ${business.business_name} and owner was (${business.name}).`;

  prompt += `The business acquired the following technologies: ${acquiredTechNames}.`;

  // add to the ai prompt the business's name and business name for a more personalized response
  if(products && products[0] && products[0].name) {
    prompt += `They sold ${products[0].name}, ${products[1].name}, and ${products[2].name}.`;
  }

  prompt += `The business had ${business.final_money} in total revenue. 100 million or higher is pretty great.`;
  prompt += `The business shipped ${business.final_orders_shipped} orders. Thousands is great.`;
  prompt += `The business had a reputation of ${business.final_reputation} out of 100. 100 is best.`;
  
  prompt += `The business had ${business.shipping_points} points in logistics, ${business.building_points} 
  points spend in manufacturing, and ${business.order_spawn_points} points in product innovation. To
  do well you want to have a lot of points and to spread it out roughly equally.`;

  prompt += `The reason the game ended was ${business.expiration_reason}. time_expired is the best
  and simply means the business made it to the end of the game timer. The others are bad situations
  that may have occurred and ended the game early.`;

  if( business.hostile_takeover_business_name ) {
    prompt += `${business.hostile_takeover_business_name} took over the business. Make massive fun out of the hilarity of this.`;
  }

  console.log('Prompting OpenAI with:', prompt);

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

    // console.log('completion:', completion);
    // console.log('message:', completion.choices[0].message);

    const functionResponse = completion.choices[0].message.function_call.arguments;
    const parsedResponse = JSON.parse(functionResponse);
    const observations = parsedResponse.observations;
    console.log('observations:', observations);
    
    endGameTextCache.set(businessId, observations);
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