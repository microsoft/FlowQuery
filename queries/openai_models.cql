// Return models from OpenAI API
with
    '$OPENAI_API_KEY' as OPENAI_API_KEY
load json from 'https://api.openai.com/v1/models'
headers {
    Authorization: f'Bearer {OPENAI_API_KEY}'
} as l
unwind l.data as model
return
    model.id as `Model ID`,
    model.object as `Object Type`,
    model.created as `Created Timestamp`,
    model.owned_by as `Owned By`