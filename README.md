# FlowQuery
A declarative query language for data processing pipelines.

FlowQuery is a declarative query language for defining and executing data processing pipelines involving (but not limited to) API calls over http. The language is very well suited for prototyping of for example LLM chain-of-thought pipelines involving fetching grounding data from APIs, and processing that grounding data in multiple successive LLM calls where the next call builds on previous results. FlowQuery is based on many of the core language constructs in the OpenCypher query language except (currently) concepts related to graphs. Additionally, FlowQuery implements its own language constructs, such as special predicate functions operating over lists. FlowQuery is not limited to its current capabilities and may evolve beyond this in the future to include language constructs such as variables and/or other language concepts from OpenCypher.

The main motivation of FlowQuery is rapid prototyping of fixed step data processing pipelines involving LLMs (for example chain-of-thought) and as such drastically shorten the work needed to create such data processing pipelines. A core business outcome of this is faster product value experimentation loops, which leads to shorter time-to-market for product ideas involving LLMs.

FlowQuery is written in TypeScript (https://www.typescriptlang.org/) and built/compiled runs both in browser or in Node as a self-contained one-file Javascript library.

## Howto
- Dev: ```npm start```
  - This will start a FlowQuery command line where you can run statements.
- Test: ```npm test```
  - This will run all unit tests.
- Build: ```npm run build``` (builds for both Node and web)
  - Then test in browser by running in PowerShell: ```.\web\run_webserver.ps1```

## Examples
```
// Test completion from Azure OpenAI API
with
    'YOUR_AZURE_OPENAI_API_KEY' as AZURE_OPENAI_API_KEY
load json from 'https://YOUR_DEPLOYMENT_NAME.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview'
headers {
    `Content-Type`: 'application/json',
    `api-key`: AZURE_OPENAI_API_KEY,
}
post {
    messages: [{role: 'user', content: 'Answer with this is a test!'}],
    temperature: 0.7
} as data
return data
```
```
/*
  This query fetches 10 cat facts from the Cat Facts API (https://catfact.ninja/fact)
  and then uses the OpenAI API to analyze those cat facts and return a short summary
  of the most interesting facts and what they imply about cats as pets.
  
  To run this query, you need to set the OPENAI_API_KEY variable to your OpenAI API key.
  You also need to set the OpenAI-Organization header to your organization ID.
    You can find your organization ID in the OpenAI dashboard.
    See https://platform.openai.com/docs/guides/chat for more information.
*/
// Setup OpenAI API key and organization ID
with
    'YOUR_OPENAI_API_KEY' as OPENAI_API_KEY,
    'YOUR_OPENAI_ORGANIZATION_ID' as OPENAI_ORGANIZATION_ID
// Get 10 cat facts and collect them into a list
unwind range(0,10) as i
load json from "https://catfact.ninja/fact" as item
with collect(item.fact) as catfacts
// Create prompt to analyze cat facts
with f"
Analyze the following cat facts and answer with a short summary of the most interesting facts, and what they imply about cats as pets:
{join(catfacts, '\n')}
" as catfacts_analysis_prompt
// Call OpenAI API to analyze cat facts
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
// Return the analysis
return catfacts_analysis
```
```
/*
Collect 10 random cat facts and create a letter histogram.
*/
unwind range(0,10) as i
load json from "https://catfact.ninja/fact" as item
with join(collect(item.fact),"") as catfacts
unwind split(catfacts,"") as letter
return letter, sum(1) as lettercount
```

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit [Contributor License Agreements](https://cla.opensource.microsoft.com).

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
