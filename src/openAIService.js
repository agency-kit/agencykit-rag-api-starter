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

    const parsedResponse = JSON.parse(completion.choices[0].message.content);
    let assistantResponse = Object.values(parsedResponse)[0];

    if (!Array.isArray(assistantResponse)) {
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

  const results = index.search(lunrQuery);
  return results.map(({ ref }) => files.find(doc => {
    if (doc.file === ref) console.log('[file retrieved]:', doc.dir);
    return doc.file === ref
  })?.content).join('\n\n');
}

export async function getResponseFromOpenAI(query, index, files) {
  const searchResults = await searchDocumentsWithOpenAI(query, index, files);
  const messages = [{
    role: 'system',
    content: 'You are an assistant that will use only the content from the user\'s provided content to inform your response. No other information is valid.'
  }, {
    role: 'user',
    content: `Here is my content: ${searchResults}`
  }];

  messages.push({
    role: 'user',
    content: query
  });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}
