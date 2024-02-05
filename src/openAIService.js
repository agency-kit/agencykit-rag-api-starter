import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY });

async function getSearchTermsFromQuery(query) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      response_format: { type: "json_object" },
      messages: [
        {
          "role": "system",
          "content": `You are a helpful assistant designed to output JSON arrays (and only arrays).
Please extract a list of ALL important keywords from the query. Only words from within the query should end up in the list.` },
        { "role": "user", "content": query },
      ],
    });

    // Assume the assistant's response is a simple list of keywords
    const parsedResponse = JSON.parse(completion.choices[0].message.content);
    // Extract the assistant's response, initially assuming it's the first value in the parsed object
    let assistantResponse = Object.values(parsedResponse)[0];

    // Check if assistantResponse is not an array, and if so, wrap it in one
    if (!Array.isArray(assistantResponse)) {
      // If it's a string or another type, make it an array
      assistantResponse = [assistantResponse];
    }

    console.log('[searching index for these keywords]:', assistantResponse);

    const keywords = assistantResponse.map(keyword => keyword.trim());

    return keywords;
  } catch (error) {
    console.error("Error in getting search terms from OpenAI:", error);
    return [];
  }
}

async function searchDocumentsWithOpenAI(query, index, files) {
  const keywords = await getSearchTermsFromQuery(query);
  const lunrQuery = keywords.join(' ');

  const results = index.search(lunrQuery); // Use Lunr to search with these keywords
  return results.map(({ ref }) => files.find(doc => {
    if (doc.file === ref) console.log('[file retrieved]:', ref);
    return doc.file === ref
  })?.content).join('\n\n');
}

export async function getResponseFromOpenAI(query, index, files) {
  // Perform the Lunr search
  const searchResults = await searchDocumentsWithOpenAI(query, index, files);
  // Format the Lunr results into messages
  const messages = [{
    role: 'system',
    content: 'You are an assistant that will use only the content from the user\'s provided content to inform your response. No other information is valid.'
  }, {
    role: 'user',
    content: `Here is my content: ${searchResults}`
  }];

  // Add the user query to the messages
  messages.push({
    role: 'user',
    content: query
  });

  // Call OpenAI's chat.completions.create method
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages
    });
    return completion.choices[0].message.content; // Assuming you want the first completion's content
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error; // Rethrow or handle as needed
  }
}
