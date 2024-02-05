# AgencyKit RAG API Starter

AgencyKit RAG API Starter is a Node.js project designed to leverage Notion as a queryable knowledge base (via [NotionCMS](https://github.com/agency-kit/notion-cms)) and provide a robust framework for building knowledge bases with rich content. It utilizes the power of OpenAI for processing and generating content based on the knowledge base created from Notion pages. This project is a demo showing how to integrate Notion content into a minimal RAG (retrieval augmented generation) system so you can query your knowledge base.

## Features

- **Notion CMS Integration**: Utilizes `@agency-kit/notion-cms` for seamless Notion integration, turning Notion pages into a dynamic knowledge base that you can directly ask about. Thanks to NotionCMS, we can get plaintext/markdown straight from Notion API with ease.
- **Knowledge Base Indexing**: Implements full-text search capabilities with `lunr`, making it easy to search through the knowledge base.
- **OpenAI Content Generation**: Leverages `openai` SDK for generating responses and content suggestions based on the knowledge base content.
- **Customizable Routes**: Offers a flexible routing system with `h3` to handle API requests and serve knowledge base content.

## Getting Started

### Prerequisites

- Node.js (Version 14 or higher recommended)
- A Notion account and API key
- An OpenAI API key

### Installation

1. Clone the repository to your local machine:
    ```bash
    git clone https://github.com/agency-kit/agencykit-rag-api-starter.git
    cd agencykit-rag-api-starter
    ```

2. Install the dependencies:
    ```bash
    npm install
    ```

3. Create a `.env` file in the root directory and add your Notion API key and OpenAI API key:
    ```env
    NOTION_API=<Your_Notion_API_Key>
    OPEN_AI_API_KEY=<Your_OpenAI_API_Key>
    ```

4. Populate your Notion database with content and note down the database ID.

5. Update the `notionCMSService.js` file with your Notion database ID:
    ```javascript
    databaseId: 'Your_Notion_Database_ID',
    ```

    Don't know how to get that? See [this guide](https://www.agencykit.so/notion-cms/quickstart/#get-database-id).

6. Build the knowledge base from your Notion content:
    ```bash
    npm run serve
    ```

### Usage

- Start the server with `npm run serve`. The server listens on port 3000 by default.
- Make a POST request to `/search` with a query to search through the knowledge base.

    Example request body:
    ```json
    {
      "query": "How to build a blog with NotionCMS"
    }
    ```

### Contributing

Contributions are welcome! Please fork the repository and open a pull request with your changes or improvements.

### License

This project is licensed under the MIT License. See the `LICENSE` file for details.

### Acknowledgements

[Lunr.js](https://lunrjs.com/)
[NotionCMS](https://github.com/agency-kit/notion-cms)
[OpenAI](https://openai.com/blog/openai-api)
[h3](https://github.com/unjs/h3)
