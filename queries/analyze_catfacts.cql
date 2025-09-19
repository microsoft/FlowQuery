/*
  This query demonstrates how to use the OpenAI API in FlowQuery to analyze cat facts.
  
  To run this query, you need to create a .env file in the same folder as this query within your VSCode project.
  Create two variables in the .env file:
    OPENAI_API_KEY='YOUR_OPENAI_API_KEY'
    OPENAI_ORGANIZATION_ID='YOUR_OPENAI_ORGANIZATION_ID'

  This FlowQuery script implements a chain-of-thoughts LLM pipeline which does the following steps:
    1. Fetches 10 cat facts from the Cat Facts API and collects them into a list.
    2. Creates a prompt to analyze the cat facts.
    3. Calls the OpenAI API with the prompt to get an analysis of the cat facts.
    4. Creates a second prompt to extract topics from the analysis.
    5. Calls the OpenAI API with the second prompt to get a list of topics.
    6. Returns the cat facts, the analysis, and the topics.
*/

// Setup OpenAI API key and organization ID (read from .env file in same directory as this query file)
with
    '$OPENAI_API_KEY' as OPENAI_API_KEY,
    '$OPENAI_ORGANIZATION_ID' as OPENAI_ORGANIZATION_ID

// 1. Get 10 cat facts and collect them into a list
unwind range(0,10) as i
load json from "https://catfact.ninja/fact" as item
with collect(item.fact) as catfacts

// 2. Create prompt to analyze cat facts
with f"
Analyze the following cat facts and answer with a short (1-3 sentences max) summary of the most interesting facts, and what they imply about cats as pets:
{stringify(catfacts)}
" as catfacts_analysis_prompt

// 3. Call OpenAI API to analyze cat facts
load json from 'https://api.openai.com/v1/chat/completions'
headers {
    `Content-Type`: 'application/json',
    Authorization: f'Bearer {OPENAI_API_KEY}',
    `OpenAI-Organization`: OPENAI_ORGANIZATION_ID
}
post {
    model: 'gpt-4o-mini',
    messages: [{role: 'user', content: catfacts_analysis_prompt}],
    temperature: 0.7
} as openai_response
with openai_response.choices[0].message.content as catfacts_analysis

// 4. Create a second prompt to extract topics from the analysis
with f"
Extract the main topics from the following analysis of cat facts, only single-word topics. Return the topics as a comma-separated list.
Analysis:
{catfacts_analysis}
" as catfacts_topics_prompt

// 5. Call OpenAI API to extract topics
load json from 'https://api.openai.com/v1/chat/completions'
headers {
    `Content-Type`: 'application/json',
    Authorization: f'Bearer {OPENAI_API_KEY}',
    `OpenAI-Organization`: OPENAI_ORGANIZATION_ID
}
post {
    model: 'gpt-4o-mini',
    messages: [{role: 'user', content: catfacts_topics_prompt}],
    temperature: 0.7
} as openai_topics_response
with openai_topics_response.choices[0].message.content as catfacts_topics

// 6. Return the analysis
return
    catfacts as `Cat Facts from API`,
    catfacts_analysis_prompt as `Cat Facts Analysis Prompt`,
    catfacts_analysis as `Cat Facts Analysis by gpt-4o-mini`,
    catfacts_topics_prompt as `Cat Facts Topics Prompt`,
    catfacts_topics as `Cat Facts Topics by gpt-4o-mini`